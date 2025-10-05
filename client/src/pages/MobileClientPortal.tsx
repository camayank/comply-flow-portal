import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { EntityManagementDialog } from '@/components/EntityManagementDialog';
import { 
  Building2, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Upload,
  Download,
  Menu,
  X,
  Home,
  Settings,
  Bell,
  Users,
  Edit,
  Calendar,
  Gift,
  CreditCard,
  Wallet,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';

const MobileClientPortal = () => {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [entityDialogMode, setEntityDialogMode] = useState<'add' | 'edit'>('add');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleAddEntity = () => {
    setSelectedEntity(null);
    setEntityDialogMode('add');
    setEntityDialogOpen(true);
  };

  const handleEditEntity = (entity: any) => {
    setSelectedEntity(entity);
    setEntityDialogMode('edit');
    setEntityDialogOpen(true);
  };

  // Fetch client entities
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ['/api/client/entities'],
  });

  // Fetch service requests
  const { data: serviceRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/client/service-requests'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'docs_uploaded': return 'bg-yellow-500';
      case 'initiated': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'docs_uploaded': return 'Docs Uploaded';
      case 'initiated': return 'Initiated';
      default: return 'Unknown';
    }
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
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="font-bold text-lg">Client Portal</h1>
                <p className="text-xs text-gray-500">Manage your business services</p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs px-3">
            <Bell className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Alerts</span>
            <Badge className="ml-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4">3</Badge>
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t px-4 py-3">
            <nav className="space-y-2">
              <button
                onClick={() => {setActiveTab('overview'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Home className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => {setActiveTab('entities'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'entities' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Building2 className="h-4 w-4" />
                Business Entities
              </button>
              <button
                onClick={() => {setActiveTab('services'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'services' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <FileText className="h-4 w-4" />
                Service Requests
              </button>
              <button
                onClick={() => {setActiveTab('documents'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'documents' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Upload className="h-4 w-4" />
                Documents
              </button>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 px-3 py-2">Client Features</p>
                <Link href="/services" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-service-catalog">
                    <ShoppingBag className="h-4 w-4" />
                    Service Catalog
                  </button>
                </Link>
                <Link href="/compliance-calendar" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-compliance-calendar">
                    <Calendar className="h-4 w-4" />
                    Compliance Calendar
                  </button>
                </Link>
                <Link href="/wallet" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-wallet">
                    <Wallet className="h-4 w-4" />
                    Wallet & Credits
                  </button>
                </Link>
                <Link href="/referral-dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-referrals">
                    <Gift className="h-4 w-4" />
                    Referral Program
                  </button>
                </Link>
                <Link href="/payment-gateway" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-payments">
                    <DollarSign className="h-4 w-4" />
                    Payments & Billing
                  </button>
                </Link>
                <div className="border-t pt-2 mt-2">
                  <Link href="/client-profile" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-profile">
                      <Users className="h-4 w-4" />
                      Profile & Settings
                    </button>
                  </Link>
                </div>
              </div>
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
                <Home className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('entities')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'entities' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Building2 className="h-4 w-4" />
                Business Entities
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'services' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="h-4 w-4" />
                Service Requests
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'documents' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Upload className="h-4 w-4" />
                Documents
              </button>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 px-3 py-2">Client Features</p>
                <Link href="/services">
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-service-catalog-desktop">
                    <ShoppingBag className="h-4 w-4" />
                    Service Catalog
                  </button>
                </Link>
                <Link href="/compliance-calendar">
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-compliance-calendar-desktop">
                    <Calendar className="h-4 w-4" />
                    Compliance Calendar
                  </button>
                </Link>
                <Link href="/wallet">
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-wallet-desktop">
                    <Wallet className="h-4 w-4" />
                    Wallet & Credits
                  </button>
                </Link>
                <Link href="/referral-dashboard">
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-referrals-desktop">
                    <Gift className="h-4 w-4" />
                    Referral Program
                  </button>
                </Link>
                <Link href="/payment-gateway">
                  <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-payments-desktop">
                    <DollarSign className="h-4 w-4" />
                    Payments & Billing
                  </button>
                </Link>
                <div className="border-t pt-2 mt-2">
                  <Link href="/client-profile">
                    <button className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-gray-600 hover:bg-gray-50" data-testid="link-profile-desktop">
                      <Users className="h-4 w-4" />
                      Profile & Settings
                    </button>
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Dashboard Overview</h2>
                <p className="text-sm lg:text-base text-gray-600">Track your business services and compliance status</p>
              </div>

              {/* Stats Cards - Mobile Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Total Entities</p>
                        <p className="text-xl lg:text-2xl font-bold">{(entities as any[]).length}</p>
                      </div>
                      <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Active Services</p>
                        <p className="text-xl lg:text-2xl font-bold">{(serviceRequests as any[]).length}</p>
                      </div>
                      <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Completed</p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {(serviceRequests as any[]).filter((r: any) => r.status === 'completed').length}
                        </p>
                      </div>
                      <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">In Progress</p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {(serviceRequests as any[]).filter((r: any) => r.status === 'in_progress').length}
                        </p>
                      </div>
                      <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/services')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Plus className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Browse Services</h3>
                        <p className="text-xs text-gray-600">Request new services</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/compliance-calendar')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Compliance Calendar</h3>
                        <p className="text-xs text-gray-600">Track deadlines</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/client-profile')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Gift className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Referral Program</h3>
                        <p className="text-xs text-gray-600">Earn rewards</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg lg:text-xl">Recent Service Activity</CardTitle>
                  <CardDescription>Latest updates on your service requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(serviceRequests as any[]).slice(0, 3).map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Service: {request.serviceId}</p>
                          <p className="text-xs text-gray-600">Amount: ₹{request.totalAmount?.toLocaleString()}</p>
                        </div>
                        <Badge className={`${getStatusColor(request.status)} text-white text-xs`}>
                          {getStatusText(request.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'entities' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Business Entities</h2>
                  <p className="text-sm lg:text-base text-gray-600">Manage your business entities and compliance</p>
                </div>
                <Button 
                  size="sm" 
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                  onClick={handleAddEntity}
                  data-testid="button-add-entity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Business
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {entitiesLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading entities...</p>
                  </div>
                ) : (entities as any[]).length > 0 ? (
                  (entities as any[]).map((entity: any) => (
                    <Card key={entity.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{entity.name}</CardTitle>
                            <CardDescription>{entity.entityType}</CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Score: {entity.complianceScore}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">GSTIN:</span>
                              <p className="font-mono text-xs">{entity.gstin}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">PAN:</span>
                              <p className="font-mono text-xs">{entity.pan}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-xs px-3 py-2"
                              onClick={() => handleEditEntity(entity)}
                              data-testid={`button-edit-entity-${entity.id}`}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              <span>Edit</span>
                            </Button>
                            <Button size="sm" className="flex-1 text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white">
                              <Eye className="h-3 w-3 mr-1" />
                              <span>View Details</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No entities found</h3>
                    <p className="text-sm text-gray-600 mb-4">Add your first business entity to get started</p>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                      onClick={handleAddEntity}
                      data-testid="button-add-first-entity"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Add Your First Business</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Service Requests</h2>
                  <p className="text-sm lg:text-base text-gray-600">Track all your service requests and progress</p>
                </div>
                <Button 
                  size="sm" 
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                  onClick={() => setLocation('/services')}
                  data-testid="button-request-service"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Request Service</span>
                </Button>
              </div>

              <div className="space-y-4">
                {requestsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading service requests...</p>
                  </div>
                ) : (serviceRequests as any[]).length > 0 ? (
                  (serviceRequests as any[]).map((request: any) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">Service: {request.serviceId}</CardTitle>
                            <CardDescription>Request ID: #{request.id}</CardDescription>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <Badge className={`${getStatusColor(request.status)} text-white text-xs`}>
                              {getStatusText(request.status)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {request.priority}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <p className="font-semibold">₹{request.totalAmount?.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Progress:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={request.progress || 0} className="flex-1" />
                                <span className="text-xs font-medium">{request.progress || 0}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-xs px-2 py-2"
                              onClick={() => setLocation(`/service-request/${request.id}`)}
                              data-testid={`button-track-progress-${request.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span>Track Progress</span>
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 text-xs px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => setLocation(`/service-request/${request.id}`)}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              <span>Upload Files</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests</h3>
                    <p className="text-sm text-gray-600 mb-4">Start your first service request to get going</p>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                      onClick={() => setLocation('/services')}
                      data-testid="button-start-first-service"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Start Your First Service Request</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Document Management</h2>
                  <p className="text-sm lg:text-base text-gray-600">Upload and manage your business documents</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Upload Documents</span>
                </Button>
              </div>

              {/* Document Upload Zone */}
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Documents</h3>
                  <p className="text-sm text-gray-600 mb-4">Drag and drop files here, or click to browse</p>
                  <Button variant="outline" size="sm" className="px-6 py-2">
                    <Upload className="h-4 w-4 mr-2" />
                    <span>Choose Files to Upload</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Documents</CardTitle>
                  <CardDescription>Your uploaded and processed documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
                    <p className="text-sm text-gray-600">Upload your first document to start managing your files</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 gap-1 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Home className="h-5 w-5 mb-1" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'entities' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Building2 className="h-5 w-5 mb-1" />
            Entities
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'services' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <FileText className="h-5 w-5 mb-1" />
            Services
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'documents' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Upload className="h-5 w-5 mb-1" />
            Documents
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation on mobile */}
      <div className="lg:hidden h-16"></div>

      {/* Entity Management Dialog */}
      <EntityManagementDialog
        open={entityDialogOpen}
        onOpenChange={setEntityDialogOpen}
        entity={selectedEntity}
        mode={entityDialogMode}
      />
    </div>
  );
};

export default MobileClientPortal;