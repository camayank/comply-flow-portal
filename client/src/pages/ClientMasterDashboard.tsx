import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout, PageShell } from '@/components/v3';
import {
  Building2,
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  MessageCircle,
  FileText,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Star,
  Target,
  Clock,
  DollarSign,
  BarChart3,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Upload,
  Home,
  Briefcase,
  Shield,
  HelpCircle,
  Settings
} from 'lucide-react';
import { BulkUploadDialogEnhanced, ColumnDefinition, BulkUploadResult } from '@/components/BulkUploadDialogEnhanced';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton-loader';
import { EmptyList, EmptySearchResults } from '@/components/ui/empty-state';

interface ClientEntity {
  id: number;
  clientId: string;
  name: string;
  entityType: string;
  complianceScore: number;
  totalRevenue: number;
  clientStatus: string;
  relationshipManager: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  industry: string;
  lastServiceDate: string;
  acquisitionDate: string;
}

interface ClientPortfolio {
  id: number;
  valueSegment: string;
  riskLevel: string;
  loyaltyTier: string;
  lifetimeValue: number;
  paymentBehavior: string;
  satisfactionScore: number;
  engagementLevel: string;
}

interface ClientContract {
  id: number;
  contractNumber: string;
  title: string;
  contractType: string;
  status: string;
  contractValue: number;
  startDate: string;
  endDate: string;
}

interface ClientCommunication {
  id: number;
  communicationType: string;
  subject: string;
  summary: string;
  actualAt: string;
  sentiment: string;
  outcome: string;
}

// Bulk upload column definitions for clients
const clientBulkColumns: ColumnDefinition[] = [
  { key: 'name', label: 'Client Name', type: 'text', required: true, placeholder: 'ABC Enterprises' },
  {
    key: 'entityType', label: 'Entity Type', type: 'select', required: true,
    options: [
      { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
      { value: 'partnership', label: 'Partnership' },
      { value: 'llp', label: 'LLP' },
      { value: 'private_limited', label: 'Private Limited' },
      { value: 'public_limited', label: 'Public Limited' },
      { value: 'opc', label: 'One Person Company' },
    ]
  },
  { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'contact@abc.com' },
  { key: 'phone', label: 'Phone', type: 'phone', required: true, placeholder: '+919876543210' },
  { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'Mumbai' },
  {
    key: 'state', label: 'State', type: 'select', required: true,
    options: [
      { value: 'MH', label: 'Maharashtra' },
      { value: 'DL', label: 'Delhi' },
      { value: 'KA', label: 'Karnataka' },
      { value: 'TN', label: 'Tamil Nadu' },
      { value: 'GJ', label: 'Gujarat' },
      { value: 'OTHER', label: 'Other' },
    ]
  },
  {
    key: 'industry', label: 'Industry', type: 'select',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail', label: 'Retail' },
      { value: 'services', label: 'Services' },
      { value: 'other', label: 'Other' },
    ]
  },
  { key: 'pan', label: 'PAN', type: 'text', placeholder: 'ABCDE1234F',
    validation: (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val) || 'Invalid PAN format'
  },
  { key: 'gstin', label: 'GSTIN', type: 'text', placeholder: '27ABCDE1234F1Z5',
    validation: (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/.test(val) || 'Invalid GSTIN format'
  },
  { key: 'relationshipManager', label: 'Relationship Manager', type: 'text', placeholder: 'RM Name' },
];

const clientBulkSampleData = [
  { name: 'ABC Enterprises', entityType: 'private_limited', email: 'info@abc.com', phone: '+919876543210', city: 'Mumbai', state: 'MH', industry: 'technology', pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5', relationshipManager: 'John Doe' },
];

// V3 Navigation Configuration
const clientNavigation = [
  {
    title: "Client Portal",
    items: [
      { label: "Dashboard", href: "/client", icon: Home },
      { label: "My Services", href: "/client/services", icon: Briefcase },
      { label: "Documents", href: "/client/documents", icon: FileText },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Calendar", href: "/client/calendar", icon: Calendar },
      { label: "Compliance Status", href: "/client/compliance", icon: Shield },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help & Support", href: "/client/support", icon: HelpCircle },
      { label: "Profile", href: "/client/profile", icon: Settings },
    ],
  },
];

const clientUser = {
  name: "Client User",
  email: "client@example.com",
};

const ClientMasterDashboard = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [viewProfileDialog, setViewProfileDialog] = useState(false);
  const [addClientDialog, setAddClientDialog] = useState(false);
  const [editClientDialog, setEditClientDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    entityType: '',
    phone: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Bulk upload handler
  const handleBulkUpload = async (data: Record<string, any>[]): Promise<BulkUploadResult> => {
    try {
      const response = await apiRequest<BulkUploadResult>('POST', '/api/clients/bulk', { items: data });
      queryClient.invalidateQueries({ queryKey: ['/api/client-master/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-master/stats'] });
      return response;
    } catch (error: any) {
      return {
        success: 0,
        failed: data.length,
        errors: [error.message || 'Bulk upload failed'],
        insertedIds: [],
      };
    }
  };

  // Fetch all clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/client-master/clients'],
  });

  // Fetch client stats
  const { data: stats } = useQuery({
    queryKey: ['/api/client-master/stats'],
  });

  // Fetch selected client profile
  const { data: clientProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/client-master/clients', selectedClient?.id, 'profile'],
    enabled: !!selectedClient,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'dormant': return 'bg-yellow-500';
      case 'churned': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'high_value': return 'bg-purple-500 text-white';
      case 'medium_value': return 'bg-blue-500 text-white';
      case 'low_value': return 'bg-gray-500 text-white';
      case 'strategic': return 'bg-gold-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getTierBadge = (tier: string) => {
    const tierColors = {
      diamond: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      platinum: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
      gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      silver: 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
      bronze: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
    };
    return tierColors[tier as keyof typeof tierColors] || 'bg-gray-400 text-white';
  };

  // Handle opening edit dialog
  const handleEditClient = (client: ClientEntity) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      entityType: client.entityType,
      phone: client.phone,
      email: client.email,
    });
    setEditClientDialog(true);
  };

  // Handle saving new client
  const handleSaveNewClient = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Client name and email are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('POST', '/api/clients', formData);
      queryClient.invalidateQueries({ queryKey: ['/api/client-master/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-master/stats'] });
      toast({
        title: 'Success',
        description: 'Client created successfully',
      });
      setAddClientDialog(false);
      setFormData({ name: '', entityType: '', phone: '', email: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle updating existing client
  const handleUpdateClient = async () => {
    if (!selectedClient || !formData.name || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Client name and email are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('PATCH', `/api/clients/${selectedClient.id}`, formData);
      queryClient.invalidateQueries({ queryKey: ['/api/client-master/clients'] });
      toast({
        title: 'Success',
        description: 'Client updated successfully',
      });
      setEditClientDialog(false);
      setSelectedClient(null);
      setFormData({ name: '', entityType: '', phone: '', email: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update client',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter((client: ClientEntity) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.clientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.clientStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout
      navigation={clientNavigation}
      user={clientUser}
      logo={<Building2 className="h-8 w-8 text-blue-600" />}
    >
      <PageShell
        title="Client Master"
        subtitle="Comprehensive client relationship management"
        breadcrumbs={[
          { label: "Client Portal", href: "/client" },
          { label: "Client Master" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkUpload(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button
              onClick={() => setAddClientDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-add-client"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        }
      >
        {/* Bulk Upload Dialog */}
        <BulkUploadDialogEnhanced
          open={showBulkUpload}
          onOpenChange={setShowBulkUpload}
          title="Bulk Import Clients"
          description="Import multiple clients from Excel or CSV file"
          columns={clientBulkColumns}
          entityName="Clients"
          onUpload={handleBulkUpload}
          sampleData={clientBulkSampleData}
          allowManualEntry={true}
        />

        <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-clients">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalClients || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-clients">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.activeClients || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-revenue">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{(stats?.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-satisfaction">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.avgSatisfaction || 0}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="directory" data-testid="tab-directory">Client Directory</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">Portfolio View</TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts">Contracts</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-clients"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48" data-testid="select-status-filter">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="dormant">Dormant</SelectItem>
                        <SelectItem value="churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Directory
                  <Badge variant="secondary">{filteredClients.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {clientsLoading ? (
                      <SkeletonList items={6} />
                    ) : filteredClients.length === 0 ? (
                      searchTerm || statusFilter !== 'all' ? (
                        <EmptySearchResults
                          searchTerm={searchTerm}
                          onClearSearch={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                        />
                      ) : (
                        <EmptyList
                          title="No clients found"
                          description="Start by adding your first client to the platform"
                        />
                      )
                    ) : (
                      filteredClients.map((client: ClientEntity) => (
                        <div 
                          key={client.id} 
                          className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          data-testid={`client-${client.clientId}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                                  {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                    {client.name}
                                  </h3>
                                  <Badge className={getStatusColor(client.clientStatus)}>
                                    {client.clientStatus}
                                  </Badge>
                                  <span className="text-sm text-gray-500">#{client.clientId}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {client.entityType}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {client.city}, {client.state}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    ₹{client.totalRevenue.toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Target className="h-4 w-4" />
                                    {client.complianceScore}% Compliance
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setViewProfileDialog(true);
                                }}
                                data-testid={`button-view-${client.clientId}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClient(client)}
                                data-testid={`button-edit-${client.clientId}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                          </div>

                          {/* Progress indicators */}
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Compliance Score</span>
                                <span className="font-medium">{client.complianceScore}%</span>
                              </div>
                              <Progress value={client.complianceScore} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Relationship Health</span>
                                <span className="font-medium">85%</span>
                              </div>
                              <Progress value={85} className="h-2" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">High Value Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">{clients.filter((c: ClientEntity) => c.totalRevenue > 100000).length}</p>
                  <p className="text-xs text-gray-500">Revenue &gt; ₹1L annually</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Medium Value Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">{clients.filter((c: ClientEntity) => c.totalRevenue >= 50000 && c.totalRevenue <= 100000).length}</p>
                  <p className="text-xs text-gray-500">Revenue ₹50K - ₹1L annually</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Growth Potential</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{clients.filter((c: ClientEntity) => c.totalRevenue < 50000).length}</p>
                  <p className="text-xs text-gray-500">Revenue &lt; ₹50K annually</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Client Segmentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.slice(0, 10).map((client: ClientEntity) => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                            {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.industry}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">₹{client.totalRevenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Lifetime Value</p>
                        </div>
                        <Badge className={client.totalRevenue > 100000 ? 'bg-purple-500' : client.totalRevenue >= 50000 ? 'bg-blue-500' : 'bg-gray-500'}>
                          {client.totalRevenue > 100000 ? 'High Value' : client.totalRevenue >= 50000 ? 'Medium' : 'Growth'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{clients.filter((c: ClientEntity) => c.clientStatus === 'active').length}</p>
                      <p className="text-sm text-gray-500">Active Contracts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">5</p>
                      <p className="text-sm text-gray-500">Expiring Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <RefreshCw className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">3</p>
                      <p className="text-sm text-gray-500">Pending Renewal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{clients.filter((c: ClientEntity) => c.clientStatus === 'churned').length}</p>
                      <p className="text-sm text-gray-500">Churned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Client Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.slice(0, 8).map((client: ClientEntity) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{client.name} - Service Agreement</p>
                          <p className="text-sm text-gray-500">Contract ID: CNT-{client.clientId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">₹{client.totalRevenue.toLocaleString()}/year</p>
                          <p className="text-xs text-gray-500">Started: {client.acquisitionDate || 'N/A'}</p>
                        </div>
                        <Badge className={client.clientStatus === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                          {client.clientStatus}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Client Growth Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">New Clients (This Month)</span>
                      <span className="font-bold text-green-600">+{Math.min(clients.length, 5)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Churn Rate</span>
                      <span className="font-bold text-red-600">{((clients.filter((c: ClientEntity) => c.clientStatus === 'churned').length / Math.max(clients.length, 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Rate</span>
                      <span className="font-bold text-blue-600">{((clients.filter((c: ClientEntity) => c.clientStatus === 'active').length / Math.max(clients.length, 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg Compliance Score</span>
                      <span className="font-bold text-purple-600">{clients.length > 0 ? Math.round(clients.reduce((sum: number, c: ClientEntity) => sum + c.complianceScore, 0) / clients.length) : 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-bold">₹{clients.reduce((sum: number, c: ClientEntity) => sum + c.totalRevenue, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg Revenue/Client</span>
                      <span className="font-bold">₹{clients.length > 0 ? Math.round(clients.reduce((sum: number, c: ClientEntity) => sum + c.totalRevenue, 0) / clients.length).toLocaleString() : 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Highest Value Client</span>
                      <span className="font-bold text-green-600">₹{clients.length > 0 ? Math.max(...clients.map((c: ClientEntity) => c.totalRevenue)).toLocaleString() : 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Revenue Concentration</span>
                      <span className="font-bold">Top 20%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Client Distribution by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="text-sm font-medium">{clients.filter((c: ClientEntity) => c.clientStatus === 'active').length}</span>
                    </div>
                    <Progress value={(clients.filter((c: ClientEntity) => c.clientStatus === 'active').length / Math.max(clients.length, 1)) * 100} className="h-3 bg-gray-200" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Inactive</span>
                      <span className="text-sm font-medium">{clients.filter((c: ClientEntity) => c.clientStatus === 'inactive').length}</span>
                    </div>
                    <Progress value={(clients.filter((c: ClientEntity) => c.clientStatus === 'inactive').length / Math.max(clients.length, 1)) * 100} className="h-3 bg-gray-200" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Dormant</span>
                      <span className="text-sm font-medium">{clients.filter((c: ClientEntity) => c.clientStatus === 'dormant').length}</span>
                    </div>
                    <Progress value={(clients.filter((c: ClientEntity) => c.clientStatus === 'dormant').length / Math.max(clients.length, 1)) * 100} className="h-3 bg-gray-200" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Churned</span>
                      <span className="text-sm font-medium">{clients.filter((c: ClientEntity) => c.clientStatus === 'churned').length}</span>
                    </div>
                    <Progress value={(clients.filter((c: ClientEntity) => c.clientStatus === 'churned').length / Math.max(clients.length, 1)) * 100} className="h-3 bg-gray-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>

        {/* Client Profile Dialog */}
        <Dialog open={viewProfileDialog} onOpenChange={setViewProfileDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Client Profile - {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          
          {profileLoading ? (
            <SkeletonCard />
          ) : clientProfile ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client ID:</span>
                      <span className="font-medium">{clientProfile.entity?.clientId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entity Type:</span>
                      <span className="font-medium">{clientProfile.entity?.entityType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(clientProfile.entity?.clientStatus)}>
                        {clientProfile.entity?.clientStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Financial Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lifetime Value:</span>
                      <span className="font-medium">₹{clientProfile.financialSummary?.lifetimeValue?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding:</span>
                      <span className="font-medium text-red-600">₹{clientProfile.financialSummary?.outstandingAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Invoices:</span>
                      <span className="font-medium">{clientProfile.financialSummary?.totalInvoices}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Communications */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Recent Communications</h3>
                <div className="space-y-2">
                  {clientProfile.recentCommunications?.slice(0, 3).map((comm: ClientCommunication) => (
                    <div key={comm.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{comm.subject}</p>
                          <p className="text-sm text-gray-600">{comm.summary}</p>
                        </div>
                        <Badge variant="outline">{comm.communicationType}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={addClientDialog} onOpenChange={(open) => {
        setAddClientDialog(open);
        if (!open) setFormData({ name: '', entityType: '', phone: '', email: '' });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Client Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-client-name"
            />
            <Select
              value={formData.entityType}
              onValueChange={(value) => setFormData({ ...formData, entityType: value })}
            >
              <SelectTrigger data-testid="select-entity-type">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                <SelectItem value="llp">LLP</SelectItem>
                <SelectItem value="opc">OPC</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              data-testid="input-phone"
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="input-email"
            />
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setAddClientDialog(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveNewClient}
                disabled={isSaving}
                data-testid="button-save-client"
              >
                {isSaving ? 'Saving...' : 'Save Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientDialog} onOpenChange={(open) => {
        setEditClientDialog(open);
        if (!open) {
          setSelectedClient(null);
          setFormData({ name: '', entityType: '', phone: '', email: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Client Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-edit-client-name"
            />
            <Select
              value={formData.entityType}
              onValueChange={(value) => setFormData({ ...formData, entityType: value })}
            >
              <SelectTrigger data-testid="select-edit-entity-type">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                <SelectItem value="llp">LLP</SelectItem>
                <SelectItem value="opc">OPC</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              data-testid="input-edit-phone"
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="input-edit-email"
            />
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setEditClientDialog(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleUpdateClient}
                disabled={isSaving}
                data-testid="button-update-client"
              >
                {isSaving ? 'Updating...' : 'Update Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </PageShell>
    </DashboardLayout>
  );
};

export default ClientMasterDashboard;