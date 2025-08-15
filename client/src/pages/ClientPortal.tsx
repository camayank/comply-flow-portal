import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Globe
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

const ClientPortal = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Simulated data - replace with real API calls
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
      createdAt: "2024-02-05T09:15:00Z",
      actionUrl: "/portal/tasks"
    }
  ];

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': case 'pending_docs': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Component renders
  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Services</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-orange-600">3</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold text-green-600">89%</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Archive className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Entities Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Business Entities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessEntities.map((entity) => (
              <Card key={entity.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedEntity === entity.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedEntity(entity.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">{entity.name}</h4>
                    <Badge variant="outline">{entity.entityType}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">CIN/LLP No:</span>
                      <span className="font-mono">{entity.cin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GSTIN:</span>
                      <span className="font-mono">{entity.gstin}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Compliance Score:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={entity.complianceScore} className="w-16 h-2" />
                        <span className="font-medium">{entity.complianceScore}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Services</CardTitle>
            <CardDescription>Current service requests and their progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceRequests.slice(0, 3).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{service.serviceName}</h4>
                      <Badge className={getStatusColor(service.status)}>
                        {service.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{service.currentMilestone}</p>
                    <Progress value={service.progress} className="h-1" />
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium">₹{service.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Due: {formatDate(service.slaDeadline)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Action items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getPriorityIcon(task.priority)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{task.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Due: {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ServicesView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Service Requests</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {serviceRequests.map((service) => (
          <Card key={service.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{service.serviceName}</h3>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status.replace('_', ' ')}
                    </Badge>
                    {getPriorityIcon(service.priority)}
                  </div>
                  <p className="text-gray-600">Service ID: {service.serviceId}</p>
                  <p className="text-gray-600">Business: {service.businessEntity}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">₹{service.totalAmount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Amount</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-600">{service.progress}% Complete</span>
                  </div>
                  <Progress value={service.progress} className="h-2" />
                  <p className="text-sm text-blue-600 mt-1">Current: {service.currentMilestone}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">SLA Deadline</p>
                    <p className="font-medium">{formatDate(service.slaDeadline)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected Completion</p>
                    <p className="font-medium">{formatDate(service.expectedCompletion)}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Team
                  </Button>
                  <Button size="sm" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const TasksView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Tasks</h2>
        <Badge variant="secondary">{clientTasks.length} Active Tasks</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {clientTasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    {getPriorityIcon(task.priority)}
                  </div>
                  <p className="text-gray-600 mb-3">{task.description}</p>
                  
                  {task.requiredDocuments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Required Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {task.requiredDocuments.map((doc, index) => (
                          <Badge key={index} variant="outline">{doc}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-right ml-4">
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">{formatDate(task.dueDate)}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                {task.taskType === 'document_upload' && (
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                )}
                {task.taskType === 'approval' && (
                  <Button size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Review & Approve
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Ask Question
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Request Extension
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const DocumentsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Document Vault</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input 
              placeholder="Search documents..." 
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Button variant="outline" size="sm">All Documents</Button>
        <Button variant="outline" size="sm">KYC</Button>
        <Button variant="outline" size="sm">Tax</Button>
        <Button variant="outline" size="sm">License</Button>
        <Button variant="outline" size="sm">Compliance</Button>
        <Button variant="outline" size="sm">Legal</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{doc.fileName}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>{doc.category.toUpperCase()}</span>
                      <span>•</span>
                      <span>Version {doc.version}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedDate)}</span>
                    </div>
                    {doc.expiryDate && (
                      <p className="text-sm text-orange-600">
                        Expires: {formatDate(doc.expiryDate)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(doc.approvalStatus)}>
                    {doc.approvalStatus}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const MessagesView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">GST Registration Support</h4>
                <span className="text-xs text-gray-500">2m ago</span>
              </div>
              <p className="text-sm text-gray-600">We've received your documents and...</p>
            </div>
            <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 bg-blue-50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">ROC Filing Query</h4>
                <span className="text-xs text-gray-500">1h ago</span>
              </div>
              <p className="text-sm text-gray-600">Regarding the annual filing deadline...</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>CA</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">CA Priya Sharma</h4>
                <p className="text-sm text-gray-600">GST Registration Support</p>
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 mb-4">
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">Hello! We've received your GST registration documents. Everything looks good so far.</p>
                  <span className="text-xs text-gray-500 mt-1 block">10:30 AM</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg p-3 max-w-xs">
                  <p className="text-sm">Great! When can I expect the registration to be completed?</p>
                  <span className="text-xs text-blue-100 mt-1 block">10:32 AM</span>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">We're targeting completion by February 12th. I'll keep you updated on the progress.</p>
                  <span className="text-xs text-gray-500 mt-1 block">10:35 AM</span>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input placeholder="Type your message..." className="flex-1" />
            <Button size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Notifications</h2>
        <Button variant="outline" size="sm">
          <CheckSquare className="h-4 w-4 mr-2" />
          Mark All Read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card key={notification.id} className={!notification.isRead ? 'border-blue-200 bg-blue-50' : ''}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{notification.title}</h4>
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(notification.createdAt)}</span>
                      <Badge variant="outline">{notification.type.replace('_', ' ')}</Badge>
                      {notification.priority === 'high' && (
                        <Badge variant="destructive">High Priority</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {notification.actionUrl && (
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
            <p className="text-gray-600">Manage your compliance services and documents</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              <Badge className="ml-2 bg-red-600 text-white">3</Badge>
            </Button>
            <Avatar>
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="services">
            <ServicesView />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksView />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsView />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesView />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortal;