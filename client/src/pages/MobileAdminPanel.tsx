import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Users, 
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Menu,
  X,
  Home,
  Calendar,
  Filter,
  Search,
  Plus,
  Eye,
  Shield,
  Workflow,
  Database,
  Globe
} from 'lucide-react';

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
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Platform Overview</h2>
                <p className="text-sm lg:text-base text-gray-600">Complete administrative control and monitoring</p>
              </div>

              {/* Key Metrics - Mobile Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Total Services</p>
                        <p className="text-xl lg:text-2xl font-bold">{(services as any[]).length}</p>
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
                        <p className="text-xl lg:text-2xl font-bold">1,247</p>
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
                        <p className="text-xl lg:text-2xl font-bold">99.7%</p>
                      </div>
                      <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Revenue Scale</p>
                        <p className="text-xl lg:text-2xl font-bold">₹100Cr+</p>
                      </div>
                      <Target className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Platform Components</CardTitle>
                    <CardDescription>Core system status and health</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
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
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">SLA Monitor</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
                    <CardDescription>Latest configuration changes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">Service catalog updated</p>
                          <p className="text-xs text-gray-600">Added 2 new services</p>
                        </div>
                        <span className="text-xs text-gray-500">2h ago</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">Workflow template created</p>
                          <p className="text-xs text-gray-600">GST registration flow</p>
                        </div>
                        <span className="text-xs text-gray-500">1d ago</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">System backup completed</p>
                          <p className="text-xs text-gray-600">All data secured</p>
                        </div>
                        <span className="text-xs text-gray-500">2d ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {servicesLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading services...</p>
                  </div>
                ) : (services as any[]).length > 0 ? (
                  (services as any[]).map((service: any) => (
                    <Card key={service.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{service.name}</CardTitle>
                            <CardDescription className="text-xs">{service.category}</CardDescription>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${service.isActive ? 'text-green-600 border-green-600' : 'text-gray-600'}`}
                          >
                            {service.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-xs text-gray-600 line-clamp-2">{service.description}</p>
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
                  ))
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

              {/* Workflow Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Templates</CardTitle>
                  <CardDescription>Pre-built workflows for common service types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
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
                    </div>

                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
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
                    </div>

                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workflow Builder Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Drag & Drop Builder</CardTitle>
                  <CardDescription>Create custom workflows with visual builder</CardDescription>
                </CardHeader>
                <CardContent>
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
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Platform Analytics</h2>
                <p className="text-sm lg:text-base text-gray-600">Monitor performance and user engagement</p>
              </div>

              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Usage Metrics</CardTitle>
                    <CardDescription>Platform activity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>API Requests</span>
                          <span>1.2M this month</span>
                        </div>
                        <Progress value={85} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Active Sessions</span>
                          <span>847 concurrent</span>
                        </div>
                        <Progress value={67} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Storage Usage</span>
                          <span>234 GB / 1 TB</span>
                        </div>
                        <Progress value={23} className="w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Metrics</CardTitle>
                    <CardDescription>System performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Response Time</span>
                          <span>127ms avg</span>
                        </div>
                        <Progress value={92} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Uptime</span>
                          <span>99.9%</span>
                        </div>
                        <Progress value={99} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Error Rate</span>
                          <span>0.1%</span>
                        </div>
                        <Progress value={5} className="w-full" />
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
                <p className="text-sm lg:text-base text-gray-600">Monitor system status and infrastructure</p>
              </div>

              {/* System Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Infrastructure Status</CardTitle>
                    <CardDescription>Core system components</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Web Server</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Healthy</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Database</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Healthy</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-sm">Cache Layer</span>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Healthy</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security Status</CardTitle>
                    <CardDescription>Security monitoring and alerts</CardDescription>
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