import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DashboardHeader,
  DashboardContent,
  DashboardGrid,
  DashboardTabs,
  MetricCard,
  AlertCard,
  StatusBadge,
  DashboardFilters
} from "@/components/ui/dashboard-layout";
import {
  MobileHeader,
  MobileNavigationMenu,
  MobileTabs,
  MobileLayout,
  MobileContent,
  MobileCard
} from "@/components/ui/mobile-navigation";
import { 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  MessageCircle,
  Download,
  Upload,
  Calendar,
  User,
  Settings,
  Bell,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Star,
  Zap,
  Target,
  History,
  Key,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  RefreshCw,
  Archive,
  Camera,
  PlusCircle,
  X,
  Edit,
  Trash2,
  CheckSquare,
  AlertCircle,
  Info,
  MapPin,
  CreditCard,
  Globe,
  Activity,
  DollarSign,
  Home,
  UserCheck,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface BusinessEntity {
  id: number;
  name: string;
  entityType: string;
  cin?: string;
  gstin?: string;
  complianceScore: number;
  isActive: boolean;
}

interface ServiceRequest {
  id: number;
  serviceId: string;
  serviceName: string;
  status: string;
  progress: number;
  currentMilestone: string;
  slaDeadline: string;
  expectedCompletion: string;
  priority: string;
  totalAmount: number;
  businessEntity: string;
}

interface ClientTask {
  id: number;
  title: string;
  description: string;
  taskType: string;
  status: string;
  priority: string;
  dueDate: string;
  serviceRequestId: number;
  requiredDocuments: string[];
}

interface Document {
  id: number;
  fileName: string;
  category: string;
  documentType: string;
  version: number;
  approvalStatus: string;
  expiryDate?: string;
  fileSize: number;
  uploadedDate: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

const ClientPortalUpgraded = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedEntity, setSelectedEntity] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  // Mock data
  const businessEntities: BusinessEntity[] = [
    {
      id: 1,
      name: "Tech Innovations Pvt Ltd",
      entityType: "Private Limited",
      cin: "U72300DL2022PTC123456",
      gstin: "07AABCT1234F1Z5",
      complianceScore: 85,
      isActive: true
    },
    {
      id: 2,
      name: "Digital Solutions LLP",
      entityType: "LLP",
      cin: "AAQ-1234",
      gstin: "07AABCT5678F1Z9",
      complianceScore: 92,
      isActive: true
    }
  ];

  const serviceRequests: ServiceRequest[] = [
    {
      id: 1,
      serviceId: "SRV001",
      serviceName: "GST Registration",
      status: "in_progress",
      progress: 75,
      currentMilestone: "Document Review",
      slaDeadline: "2024-02-15",
      expectedCompletion: "2024-02-12",
      priority: "high",
      totalAmount: 2999,
      businessEntity: "Tech Innovations Pvt Ltd"
    },
    {
      id: 2,
      serviceId: "SRV002",
      serviceName: "Annual ROC Filing",
      status: "pending_docs",
      progress: 25,
      currentMilestone: "Awaiting Documents",
      slaDeadline: "2024-03-30",
      expectedCompletion: "2024-03-25",
      priority: "medium",
      totalAmount: 5999,
      businessEntity: "Digital Solutions LLP"
    }
  ];

  const clientTasks: ClientTask[] = [
    {
      id: 1,
      title: "Upload Director's PAN Cards",
      description: "Please upload clear copies of all directors' PAN cards for GST registration",
      taskType: "document_upload",
      status: "pending",
      priority: "high",
      dueDate: "2024-02-10",
      serviceRequestId: 1,
      requiredDocuments: ["Director 1 PAN", "Director 2 PAN"]
    },
    {
      id: 2,
      title: "Review and Sign MOA/AOA",
      description: "Please review the draft Memorandum and Articles of Association",
      taskType: "approval",
      status: "pending",
      priority: "medium",
      dueDate: "2024-02-12",
      serviceRequestId: 2,
      requiredDocuments: []
    }
  ];

  const documents: Document[] = [
    {
      id: 1,
      fileName: "Certificate_of_Incorporation.pdf",
      category: "legal",
      documentType: "incorporation_certificate",
      version: 1,
      approvalStatus: "approved",
      fileSize: 1024000,
      uploadedDate: "2024-01-15"
    },
    {
      id: 2,
      fileName: "GST_Certificate.pdf",
      category: "tax",
      documentType: "gst_certificate",
      version: 1,
      approvalStatus: "pending",
      expiryDate: "2025-01-15",
      fileSize: 512000,
      uploadedDate: "2024-01-20"
    }
  ];

  const notifications: Notification[] = [
    {
      id: 1,
      title: "Document Approved",
      message: "Your incorporation certificate has been approved and is ready for download",
      type: "document_approval",
      priority: "normal",
      isRead: false,
      createdAt: "2024-02-05T10:30:00Z",
      actionUrl: "/portal/documents"
    },
    {
      id: 2,
      title: "Task Due Soon",
      message: "Upload Director's PAN Cards - Due in 2 days",
      type: "task_reminder",
      priority: "high",
      isRead: false,
      createdAt: "2024-02-08T09:00:00Z",
      actionUrl: "/portal/tasks"
    }
  ];

  // Tab configuration for mobile and desktop
  const tabConfig = [
    { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
    { id: "entities", label: "Business Entities", icon: <Building2 className="h-4 w-4" /> },
    { id: "services", label: "Service Requests", icon: <FileText className="h-4 w-4" />, badge: serviceRequests.length },
    { id: "tasks", label: "My Tasks", icon: <CheckSquare className="h-4 w-4" />, badge: clientTasks.filter(t => t.status === 'pending').length },
    { id: "documents", label: "Documents", icon: <Archive className="h-4 w-4" /> },
    { id: "support", label: "Support", icon: <MessageCircle className="h-4 w-4" /> },
  ];

  // Mobile navigation items
  const mobileNavItems = tabConfig.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    active: activeTab === tab.id,
    badge: tab.badge,
    onClick: () => setActiveTab(tab.id)
  }));

  // Filter options
  const filterOptions = [
    { value: "all", label: "All Items" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "urgent", label: "Urgent" }
  ];

  const selectedEntityData = businessEntities.find(e => e.id === selectedEntity);

  // Client Overview Dashboard
  const ClientOverview = () => {
    const pendingTasks = clientTasks.filter(t => t.status === 'pending').length;
    const inProgressServices = serviceRequests.filter(s => s.status === 'in_progress').length;
    const overdueItems = clientTasks.filter(t => new Date(t.dueDate) < new Date()).length;

    return (
      <div className="space-y-6">
        {/* Entity Selection */}
        {selectedEntityData && (
          <Card className="border-l-4 border-l-blue-500" data-testid="card-selected-entity">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{selectedEntityData.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEntityData.entityType}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {selectedEntityData.cin && <span>CIN: {selectedEntityData.cin}</span>}
                    {selectedEntityData.gstin && <span>GSTIN: {selectedEntityData.gstin}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Compliance Score</div>
                  <div className="text-2xl font-bold text-green-600">{selectedEntityData.complianceScore}%</div>
                  <Progress value={selectedEntityData.complianceScore} className="w-20 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgent Notifications */}
        {notifications.filter(n => !n.isRead && n.priority === 'high').length > 0 && (
          <AlertCard
            type="warning"
            title="Urgent Action Required"
            message={`You have ${notifications.filter(n => !n.isRead && n.priority === 'high').length} urgent notifications`}
            actions={
              <Button size="sm" data-testid="button-view-notifications">
                View All
              </Button>
            }
          />
        )}

        {/* Key Metrics */}
        <DashboardGrid>
          <MetricCard
            title="Pending Tasks"
            value={pendingTasks}
            subtitle="Require your action"
            icon={<CheckSquare className="h-5 w-5" />}
            color={pendingTasks > 5 ? "red" : pendingTasks > 2 ? "orange" : "green"}
          />
          <MetricCard
            title="Active Services"
            value={inProgressServices}
            subtitle="Currently processing"
            icon={<Activity className="h-5 w-5" />}
            color="blue"
          />
          <MetricCard
            title="Compliance Score"
            value={`${selectedEntityData?.complianceScore || 0}%`}
            subtitle="Overall rating"
            icon={<Shield className="h-5 w-5" />}
            color={selectedEntityData && selectedEntityData.complianceScore > 80 ? "green" : "orange"}
          />
          <MetricCard
            title="Total Services"
            value={serviceRequests.length}
            subtitle="All time requests"
            icon={<FileText className="h-5 w-5" />}
            color="purple"
          />
        </DashboardGrid>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-recent-services">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Service Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceRequests.slice(0, 3).map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{service.serviceName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{service.currentMilestone}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={service.progress} className="w-16 h-1" />
                        <span className="text-xs text-gray-500">{service.progress}%</span>
                      </div>
                    </div>
                    <StatusBadge status={service.status} variant="compact" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-new-service">
                  <PlusCircle className="h-5 w-5" />
                  <span className="text-sm">New Service</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-upload-docs">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Upload Docs</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-track-services">
                  <Eye className="h-5 w-5" />
                  <span className="text-sm">Track Services</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-support">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">Get Support</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Business Entities Tab
  const BusinessEntities = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Business Entities</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your registered business entities</p>
        </div>
        <Button data-testid="button-add-entity">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Entity
        </Button>
      </div>

      <DashboardGrid className="lg:grid-cols-2">
        {businessEntities.map((entity) => (
          <Card 
            key={entity.id} 
            className={`hover:shadow-md transition-all cursor-pointer ${
              selectedEntity === entity.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedEntity(entity.id)}
            data-testid={`card-entity-${entity.id}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{entity.name}</CardTitle>
                <StatusBadge status={entity.isActive ? "active" : "inactive"} />
              </div>
              <CardDescription>{entity.entityType}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entity.cin && (
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">CIN: </span>
                    <span className="font-mono">{entity.cin}</span>
                  </div>
                )}
                {entity.gstin && (
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">GSTIN: </span>
                    <span className="font-mono">{entity.gstin}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Compliance Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={entity.complianceScore} className="w-16 h-2" />
                    <span className="text-sm font-medium">{entity.complianceScore}%</span>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" data-testid={`button-manage-${entity.id}`}>
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-${entity.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </DashboardGrid>
    </div>
  );

  // Service Requests Tab  
  const ServiceRequests = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service Requests</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your service requests and their progress</p>
        </div>
        <Button data-testid="button-new-service-request">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <div className="grid gap-4">
        {serviceRequests.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow" data-testid={`card-service-${service.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{service.serviceName}</h3>
                    <Badge variant="outline" className="text-xs">{service.serviceId}</Badge>
                    <StatusBadge status={service.status} />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    Current Stage: {service.currentMilestone}
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Progress</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={service.progress} className="flex-1" />
                        <span className="font-medium">{service.progress}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">SLA Deadline</span>
                      <p className="font-medium mt-1">{service.slaDeadline}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Expected Completion</span>
                      <p className="font-medium mt-1">{service.expectedCompletion}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Amount</span>
                      <p className="font-medium mt-1">₹{service.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <Button size="sm" variant="outline" data-testid={`button-track-${service.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    Track
                  </Button>
                  <Button size="sm" data-testid={`button-contact-${service.id}`}>
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Placeholder components for other tabs
  const MyTasks = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Task management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const Documents = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Document management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const Support = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Support interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return (
    <MobileLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title="Client Portal"
          subtitle="Manage your business services"
          leftIcon={<Building2 className="h-6 w-6" />}
          notifications={unreadNotifications}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          rightActions={
            <Button size="sm" variant="outline" className="text-xs px-3" data-testid="button-profile-mobile">
              <User className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
          }
        />
        
        <MobileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabConfig}
        />
        
        <MobileNavigationMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          items={mobileNavItems}
        />
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Client Portal</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Business Services</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {tabConfig.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid={`nav-${tab.id}`}
                >
                  {tab.icon}
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4">
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <DashboardHeader
            title="Client Dashboard"
            subtitle="Monitor your business services and compliance"
            notifications={unreadNotifications}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" data-testid="button-notifications-desktop">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                <Button size="sm" data-testid="button-profile-desktop">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </div>
            }
          />
          
          <DashboardContent>
            <DashboardTabs defaultValue={activeTab}>
              <TabsContent value="overview" className="space-y-6">
                <DashboardFilters
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  filterValue={filterBy}
                  onFilterChange={setFilterBy}
                  filterOptions={filterOptions}
                />
                <ClientOverview />
              </TabsContent>

              <TabsContent value="entities" className="space-y-6">
                <BusinessEntities />
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <ServiceRequests />
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                <MyTasks />
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <Documents />
              </TabsContent>

              <TabsContent value="support" className="space-y-6">
                <Support />
              </TabsContent>
            </DashboardTabs>
          </DashboardContent>
        </main>
      </div>
      
      {/* Mobile Content */}
      <div className="lg:hidden">
        <MobileContent>
          {activeTab === 'overview' && <ClientOverview />}
          {activeTab === 'entities' && <BusinessEntities />}
          {activeTab === 'services' && <ServiceRequests />}
          {activeTab === 'tasks' && <MyTasks />}
          {activeTab === 'documents' && <Documents />}
          {activeTab === 'support' && <Support />}
        </MobileContent>
      </div>
    </MobileLayout>
  );
};

export default ClientPortalUpgraded;