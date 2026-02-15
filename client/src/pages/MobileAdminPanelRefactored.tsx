import { useState } from 'react';
import { Link } from 'wouter';
import {
  Shield,
  BarChart3,
  FileText,
  Workflow,
  Database,
  Plus,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Zap,
  ArrowRight,
  Target,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/layouts';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get } from '@/lib/api';
import { ServiceConfigForm } from '@/components/ServiceConfigForm';

interface ConfigStats {
  totalServices: number;
  activeWorkflows: number;
  totalClients: number;
  systemHealth: number;
}

interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  clients: number;
  basePrice: number;
}

const MobileAdminPanelRefactored = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Fetch admin config stats
  const statsQuery = useStandardQuery<ConfigStats>({
    queryKey: ['/api/admin/config-stats'],
    queryFn: () => get<{ data: ConfigStats }>('/api/admin/config-stats').then(res => res.data),
  });

  // Fetch services
  const servicesQuery = useStandardQuery<Service[]>({
    queryKey: ['/api/admin/services'],
    queryFn: () => get<{ data: Service[] }>('/api/admin/services').then(res => res.data),
    emptyState: {
      title: 'No services configured',
      description: 'Create your first service to get started.',
    },
  });

  const navigation = [
    { label: 'Platform Overview', href: '#', icon: BarChart3, current: activeTab === 'overview', onClick: () => setActiveTab('overview') },
    { label: 'Service Management', href: '#', icon: FileText, current: activeTab === 'services', onClick: () => setActiveTab('services') },
    { label: 'Workflow Builder', href: '#', icon: Workflow, current: activeTab === 'workflows', onClick: () => setActiveTab('workflows') },
    { label: 'Analytics', href: '#', icon: BarChart3, current: activeTab === 'analytics', onClick: () => setActiveTab('analytics') },
    { label: 'System Health', href: '#', icon: Database, current: activeTab === 'system', onClick: () => setActiveTab('system') },
  ];

  const openCreateServiceForm = () => {
    setSelectedService(null);
    setFormMode('create');
    setServiceFormOpen(true);
  };

  const openEditServiceForm = (service: any) => {
    setSelectedService(service);
    setFormMode('edit');
    setServiceFormOpen(true);
  };

  const configStats = statsQuery.data;

  return (
    <>
      <DashboardLayout
        title="Admin Control"
        navigation={navigation}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Admin Dashboard Header */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Admin Dashboard</h2>
                  <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-0">Configure services, set up workflows, and manage platform operations</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2" onClick={openCreateServiceForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Service
                  </Button>
                  <Link href="/admin/workflow-import">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Workflow className="h-4 w-4 mr-2" />
                      Import Workflow
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            {statsQuery.render((data) => (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Total Services</p>
                      <p className="text-xl lg:text-2xl font-bold">
                        {data?.totalServices || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Workflow className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Active Workflows</p>
                      <p className="text-xl lg:text-2xl font-bold">
                        {data?.activeWorkflows || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Users className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Total Clients</p>
                      <p className="text-xl lg:text-2xl font-bold">
                        {data?.totalClients || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Database className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">System Health</p>
                      <p className="text-xl lg:text-2xl font-bold">
                        {data?.systemHealth || 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm lg:text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={openCreateServiceForm}>
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">New Service</span>
                  </Button>
                  <Link href="/admin/workflow-import">
                    <Button variant="outline" className="flex flex-col h-auto py-4 gap-2 w-full">
                      <Workflow className="h-5 w-5" />
                      <span className="text-xs">Add Workflow</span>
                    </Button>
                  </Link>
                  <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs">View Reports</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                    <Database className="h-5 w-5" />
                    <span className="text-xs">System Status</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm lg:text-base">Recent Configuration Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New service added</p>
                      <p className="text-xs text-gray-600">GST Filing Service configured successfully</p>
                    </div>
                    <span className="text-xs text-gray-500">2h ago</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Workflow updated</p>
                      <p className="text-xs text-gray-600">Company Registration workflow optimized</p>
                    </div>
                    <span className="text-xs text-gray-500">5h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Service Management</h2>
                <p className="text-sm lg:text-base text-gray-600">Configure and manage all platform services</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateServiceForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Service
              </Button>
            </div>

            {/* Services List */}
            {servicesQuery.render((services) => (
              <div className="grid gap-4">
                {services?.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm lg:text-base">{service.name}</h3>
                            <p className="text-xs lg:text-sm text-gray-600">{service.description}</p>
                          </div>
                          <Badge className={service.isActive ? 'bg-green-500' : 'bg-gray-400'}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          <Badge variant="outline">{service.category}</Badge>
                          <Badge variant="outline">₹{service.basePrice.toLocaleString()}</Badge>
                          <Badge variant="outline">{service.clients} clients</Badge>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="flex-1 text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs"
                            onClick={() => openEditServiceForm(service)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs px-3">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Workflow Builder</h2>
                <p className="text-sm lg:text-base text-gray-600">Design and automate service workflows</p>
              </div>
              <Link href="/admin/workflow-import">
                <Button className="bg-blue-600 hover:bg-blue-700 w-full lg:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Import Workflow
                </Button>
              </Link>
            </div>

            <Card>
              <CardContent className="p-6 text-center">
                <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">Workflow management interface coming soon</p>
                <Link href="/admin/workflow-import">
                  <Button variant="outline">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Go to Workflow Import
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold mb-2">Platform Analytics</h2>
              <p className="text-sm lg:text-base text-gray-600">Monitor platform usage and performance metrics</p>
            </div>

            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">Advanced analytics dashboard coming soon</p>
                <Button variant="outline">
                  View Basic Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold mb-2">System Health</h2>
              <p className="text-sm lg:text-base text-gray-600">Monitor system status and performance</p>
            </div>

            <Card>
              <CardContent className="p-6 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">System monitoring dashboard coming soon</p>
                <Button variant="outline">
                  Check Status
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardLayout>

      {/* Service Config Form Dialog */}
      {serviceFormOpen && (
        <ServiceConfigForm
          open={serviceFormOpen}
          onOpenChange={setServiceFormOpen}
          mode={formMode}
          service={selectedService}
        />
      )}
    </>
  );
};

export default MobileAdminPanelRefactored;
