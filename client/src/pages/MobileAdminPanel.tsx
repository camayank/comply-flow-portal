import { useState } from 'react';
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
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MobileAdminPanel = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch admin config stats
  const { data: configStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/config-stats'],
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/admin/services'],
  });

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
              {/* Welcome Hero Section */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <h2 className="text-xl lg:text-2xl font-bold mb-2">Welcome to Your Practice Control Center</h2>
                    <p className="text-sm lg:text-base text-blue-100 mb-4 lg:mb-0">Configure services, manage workflows, and monitor your entire operation from one dashboard</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2" onClick={() => setActiveTab('services')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Quick Setup Guide
                    </Button>
                    <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-4 py-2">
                      <FileText className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Actions - Clear CTAs */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card 
                    className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setActiveTab('services')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Configure Services</h4>
                          <p className="text-xs text-gray-600">Add & manage your service offerings</p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Manage Services ({(services as any[]).length} active)
                      </Button>
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setActiveTab('workflows')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Workflow className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Build Workflows</h4>
                          <p className="text-xs text-gray-600">Design automated service processes</p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                        Workflow Builder
                      </Button>
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">View Analytics</h4>
                          <p className="text-xs text-gray-600">Monitor performance & insights</p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                        View Reports
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Platform Status Dashboard */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Platform Status</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">Active Services</p>
                          <p className="text-xl lg:text-2xl font-bold text-blue-600">{(services as any[]).length}</p>
                          <p className="text-xs text-green-600">Ready to use</p>
                        </div>
                        <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">Platform Users</p>
                          <p className="text-xl lg:text-2xl font-bold text-green-600">24</p>
                          <p className="text-xs text-green-600">Active team members</p>
                        </div>
                        <Users className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">System Health</p>
                          <p className="text-xl lg:text-2xl font-bold text-green-600">99.7%</p>
                          <p className="text-xs text-green-600">All systems operational</p>
                        </div>
                        <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-600">Revenue Capacity</p>
                          <p className="text-xl lg:text-2xl font-bold text-purple-600">₹10Cr+</p>
                          <p className="text-xs text-purple-600">Scale ready</p>
                        </div>
                        <Target className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Getting Started Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Platform Setup Checklist</CardTitle>
                  <CardDescription>Complete these steps to get your practice management platform running</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-green-800">Platform Initialized</p>
                        <p className="text-xs text-green-600">Your practice management platform is ready</p>
                      </div>
                      <Badge className="bg-green-500 text-white text-xs">Complete</Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer" onClick={() => setActiveTab('services')}>
                      <div className="h-5 w-5 border-2 border-blue-600 rounded-full flex items-center justify-center">
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-blue-800">Configure Your Services</p>
                        <p className="text-xs text-blue-600">Set up the services you offer to clients</p>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                        Start Now
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="h-5 w-5 border-2 border-gray-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-600">Build Workflows</p>
                        <p className="text-xs text-gray-500">Create automated processes for your services</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="h-5 w-5 border-2 border-gray-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-600">Invite Team Members</p>
                        <p className="text-xs text-gray-500">Add your staff and assign roles</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
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
                <Button size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
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
                            <Button size="sm" className="flex-1 text-xs px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white">
                              <Settings className="h-3 w-3 mr-1" />
                              <span>Configure</span>
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
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
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
    </div>
  );
};

export default MobileAdminPanel;