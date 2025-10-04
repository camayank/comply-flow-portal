import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  X,
  Shield,
  Search,
  Settings,
  BarChart3,
  FileText,
  Workflow,
  Database,
  Users,
  Target,
  Plus,
  CheckCircle,
  Eye,
  Home,
  Edit,
  Trash2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServiceConfigForm } from '@/components/ServiceConfigForm';

const MobileAdminPanel = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Fetch admin config stats
  const { data: configStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/config-stats'],
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/admin/services'],
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="font-bold text-lg">Admin Control</h1>
                <p className="text-xs text-gray-500">Platform configuration</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs px-3">
              <Search className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Button size="sm" variant="outline" className="text-xs px-3">
              <Settings className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t px-4 py-3">
            <nav className="space-y-2">
              <button
                onClick={() => {setActiveTab('overview'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Platform Overview
              </button>
              <button
                onClick={() => {setActiveTab('services'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'services' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <FileText className="h-4 w-4" />
                Service Management
              </button>
              <button
                onClick={() => {setActiveTab('workflows'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'workflows' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Workflow className="h-4 w-4" />
                Workflow Builder
              </button>
              <button
                onClick={() => {setActiveTab('analytics'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => {setActiveTab('system'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'system' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Database className="h-4 w-4" />
                System Health
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Platform Overview
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'services' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="h-4 w-4" />
                Service Management
              </button>
              <button
                onClick={() => setActiveTab('workflows')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'workflows' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Workflow className="h-4 w-4" />
                Workflow Builder
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'system' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Database className="h-4 w-4" />
                System Health
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
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
                    <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2" onClick={() => setActiveTab('system')}>
                      <Settings className="h-4 w-4 mr-2" />
                      System Settings
                    </Button>
                  </div>
                </div>
              </div>

              {/* System Configuration Status */}
              <div>
                <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-sm">Services</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">{(services as any[]).length} configured</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Manage service offerings and pricing</p>
                      <Button 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setActiveTab('services')}
                      >
                        Configure Services
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Workflow className="h-5 w-5 text-green-600" />
                          <h4 className="font-semibold text-sm">Workflows</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">3 templates</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Set up automated process flows</p>
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setActiveTab('workflows')}
                      >
                        Build Workflows
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-sm">Team</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">24 users</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Manage team members and roles</p>
                      <Button 
                        size="sm" 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => setActiveTab('system')}
                      >
                        Manage Team
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* DigiComply Products - Quick Access */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">DigiComply AI Products</h3>
                  <Badge variant="outline" className="text-green-600 border-green-600">3 Available</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href="/autocomply">
                    <Card className="cursor-pointer hover:shadow-lg transition-all border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5 text-purple-600" />
                          </div>
                          <Badge className="bg-green-500 text-white text-xs">Available</Badge>
                        </div>
                        <h4 className="font-semibold mb-1">AutoComply</h4>
                        <p className="text-xs text-gray-600 mb-3">AI Workflow Automation</p>
                        <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                          <span>Launch</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/taxtracker">
                    <Card className="cursor-pointer hover:shadow-lg transition-all border-green-200 bg-gradient-to-br from-green-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          <Badge className="bg-green-500 text-white text-xs">Available</Badge>
                        </div>
                        <h4 className="font-semibold mb-1">TaxTracker</h4>
                        <p className="text-xs text-gray-600 mb-3">Multi-Entity Tax Filing</p>
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span>Launch</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/digiscore">
                    <Card className="cursor-pointer hover:shadow-lg transition-all border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-600" />
                          </div>
                          <Badge className="bg-green-500 text-white text-xs">Available</Badge>
                        </div>
                        <h4 className="font-semibold mb-1">DigiScore</h4>
                        <p className="text-xs text-gray-600 mb-3">Compliance Health Score</p>
                        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <span>Launch</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>

              {/* Current Operations Status */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Current Operations</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">Services Configured</p>
                          <p className="text-xl lg:text-2xl font-bold text-blue-600">{(services as any[]).length}</p>
                          <p className="text-xs text-gray-600">Available for use</p>
                        </div>
                        <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">Active Users</p>
                          <p className="text-xl lg:text-2xl font-bold text-green-600">24</p>
                          <p className="text-xs text-gray-600">Team members</p>
                        </div>
                        <Users className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">System Status</p>
                          <p className="text-xl lg:text-2xl font-bold text-green-600">Online</p>
                          <p className="text-xs text-gray-600">All services running</p>
                        </div>
                        <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">Workflows</p>
                          <p className="text-xl lg:text-2xl font-bold text-purple-600">3</p>
                          <p className="text-xs text-gray-600">Templates ready</p>
                        </div>
                        <Workflow className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Configuration Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Required Configuration</CardTitle>
                  <CardDescription>Complete these essential setup tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-green-800">Database Setup</p>
                        <p className="text-xs text-green-600">PostgreSQL database configured and running</p>
                      </div>
                      <Badge className="bg-green-500 text-white text-xs">Complete</Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer" onClick={() => setActiveTab('services')}>
                      <div className="h-5 w-5 border-2 border-blue-600 rounded-full flex items-center justify-center">
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-blue-800">Service Configuration</p>
                        <p className="text-xs text-blue-600">Add services your business offers ({(services as any[]).length} configured)</p>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                        Configure
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer" onClick={() => setActiveTab('workflows')}>
                      <div className="h-5 w-5 border-2 border-gray-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-600">Workflow Setup</p>
                        <p className="text-xs text-gray-500">Define step-by-step processes for each service</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        Set Up
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer" onClick={() => setActiveTab('system')}>
                      <div className="h-5 w-5 border-2 border-gray-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-600">Team Setup</p>
                        <p className="text-xs text-gray-500">Add team members and assign roles</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        Add Users
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Service Management</h2>
                  <p className="text-sm lg:text-base text-gray-600">Configure and manage platform services</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2" onClick={openCreateServiceForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Add Service</span>
                </Button>
              </div>

              {servicesLoading ? (
                <div className="text-center py-8">Loading services...</div>
              ) : services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-sm">{service.serviceName}</h3>
                            <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Type:</span>
                            <Badge variant="outline" className="text-xs">{service.serviceType}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Periodicity:</span>
                            <Badge variant="outline" className="text-xs">{service.periodicity}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs px-2 py-2">
                              <Eye className="h-3 w-3 mr-1" />
                              <span>Preview</span>
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 text-xs px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => openEditServiceForm(service)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              <span>Edit</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="col-span-full text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services configured</h3>
                  <p className="text-sm text-gray-600 mb-4">Add your first service to start building workflows</p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3" onClick={openCreateServiceForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Configure Your First Service</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Workflow Builder</h2>
                  <p className="text-sm lg:text-base text-gray-600">Create and manage service workflows with no-code builder</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Build Workflow</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="border border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Workflow className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-sm">Incorporation Workflow</h4>
                    </div>
                    <p className="text-xs text-gray-600">Complete company incorporation process</p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="outline" className="text-xs">5 Steps</Badge>
                      <Button size="sm" variant="outline" className="text-xs px-3 py-1">
                        <span>Use Template</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Workflow className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-sm">GST Registration</h4>
                    </div>
                    <p className="text-xs text-gray-600">GST registration and compliance setup</p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="outline" className="text-xs">3 Steps</Badge>
                      <Button size="sm" variant="outline" className="text-xs px-3 py-1">
                        <span>Use Template</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Workflow className="h-5 w-5 text-purple-600" />
                      <h4 className="font-medium text-sm">Annual Filing</h4>
                    </div>
                    <p className="text-xs text-gray-600">Annual compliance and ROC filing</p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="outline" className="text-xs">4 Steps</Badge>
                      <Button size="sm" variant="outline" className="text-xs px-3 py-1">
                        <span>Use Template</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Visual Workflow Builder</h3>
                    <p className="text-sm text-gray-600 mb-4">Drag and drop components to build custom service workflows</p>
                    <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3">
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Start Building Your Workflow</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Analytics Dashboard</h2>
                <p className="text-sm lg:text-base text-gray-600">Monitor platform performance and insights</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Service Performance</CardTitle>
                    <CardDescription>Track service completion rates and efficiency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-sm">GST Returns</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">98%</p>
                          <p className="text-xs text-gray-600">Success Rate</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="font-medium text-sm">Incorporation</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">95%</p>
                          <p className="text-xs text-gray-600">Success Rate</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="font-medium text-sm">Annual Filing</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-purple-600">92%</p>
                          <p className="text-xs text-gray-600">Success Rate</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue Analytics</CardTitle>
                    <CardDescription>Track platform revenue and growth</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                        <p className="text-2xl font-bold">₹2.4 Cr</p>
                        <p className="text-xs opacity-90">Total Revenue This Year</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-lg font-semibold text-green-600">₹48L</p>
                          <p className="text-xs text-gray-600">This Month</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-lg font-semibold text-blue-600">+24%</p>
                          <p className="text-xs text-gray-600">Growth Rate</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">System Health</h2>
                <p className="text-sm lg:text-base text-gray-600">Monitor system performance and security</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Components</CardTitle>
                    <CardDescription>Core platform infrastructure status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">API Gateway</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Operational</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Database</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Operational</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Workflow Engine</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Operational</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security Status</CardTitle>
                    <CardDescription>Security monitoring and compliance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">SSL Certificate</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Valid</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Firewall</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Backup Status</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Updated</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-5 gap-1 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <BarChart3 className="h-4 w-4 mb-1" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'services' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <FileText className="h-4 w-4 mb-1" />
            Services
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'workflows' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Workflow className="h-4 w-4 mb-1" />
            Workflows
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'analytics' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <BarChart3 className="h-4 w-4 mb-1" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'system' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Database className="h-4 w-4 mb-1" />
            System
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation on mobile */}
      <div className="lg:hidden h-16"></div>

      {/* Service Configuration Form */}
      <ServiceConfigForm
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={selectedService}
        mode={formMode}
      />
    </div>
  );
};

export default MobileAdminPanel;