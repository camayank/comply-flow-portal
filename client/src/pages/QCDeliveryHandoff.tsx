import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  SERVICE_REQUEST_STATUSES,
  DELIVERY_STATUSES,
  STATUS_LABELS as SHARED_STATUS_LABELS,
  STATUS_COLORS as SHARED_STATUS_COLORS
} from '@/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  Package,
  FileText,
  User,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Eye,
  Send,
  Download,
  Upload,
  Briefcase,
  RefreshCw,
  Filter,
  Search,
  Truck,
  Mail,
  Phone,
  MessageSquare,
  Shield,
  Star,
  ArrowLeft
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface HandoffItem {
  id: number;
  serviceRequestId: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  serviceType: string;
  qcApprovedAt: string;
  qcApprovedBy: string;
  qualityScore: number;
  reviewNotes: string;
  priority: string;
  status: 'ready_for_delivery' | 'delivered' | 'awaiting_client_confirmation' | 'completed';
  deliverables: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    isReady: boolean;
    isOfficial: boolean;
  }>;
  completionSummary: string;
  nextSteps: string[];
  estimatedDeliveryDate: string;
}

interface HandoffStats {
  readyForDelivery: number;
  inProgress: number;
  delivered: number;
  confirmed: number;
  avgDeliveryTime: number;
  deliverySuccessRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  ready_for_delivery: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  awaiting_client_confirmation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
};

const STATUS_LABELS: Record<string, string> = {
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Delivered',
  awaiting_client_confirmation: 'Awaiting Confirmation',
  completed: 'Completed'
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
  critical: 'bg-purple-100 text-purple-800'
};

export default function QCDeliveryHandoff() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('ready');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<HandoffItem | null>(null);
  const [isHandoffDialogOpen, setIsHandoffDialogOpen] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [includeDocuments, setIncludeDocuments] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');

  // Fetch handoff queue data
  const { data: handoffData, isLoading, refetch } = useQuery<{ items: HandoffItem[], stats: HandoffStats }>({
    queryKey: ['qc-delivery-handoff', selectedTab, searchTerm, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        tab: selectedTab,
        search: searchTerm,
        priority: priorityFilter
      });
      const response = await fetch(`/api/ops/delivery-handoff?${params.toString()}`);
      if (!response.ok) {
        // Return mock data for demo
        return {
          items: [
            {
              id: 1,
              serviceRequestId: 101,
              clientId: 1,
              clientName: 'Acme Corp',
              clientEmail: 'contact@acme.com',
              clientPhone: '+91 98765 43210',
              serviceName: 'GST Registration',
              serviceType: 'gst_registration',
              qcApprovedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              qcApprovedBy: 'QC Team Lead',
              qualityScore: 95,
              reviewNotes: 'All documents verified. Ready for delivery.',
              priority: 'high',
              status: 'ready_for_delivery',
              deliverables: [
                { id: 'd1', name: 'GST Certificate', type: 'pdf', size: '250 KB', isReady: true, isOfficial: true },
                { id: 'd2', name: 'Registration Acknowledgement', type: 'pdf', size: '120 KB', isReady: true, isOfficial: true },
                { id: 'd3', name: 'Application Form ARN', type: 'pdf', size: '85 KB', isReady: true, isOfficial: false }
              ],
              completionSummary: 'GST registration completed successfully. GSTIN issued.',
              nextSteps: ['Enable invoice generation', 'Setup GST return calendar', 'Configure TDS settings'],
              estimatedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 2,
              serviceRequestId: 102,
              clientId: 2,
              clientName: 'TechStart Inc',
              clientEmail: 'admin@techstart.in',
              clientPhone: '+91 87654 32109',
              serviceName: 'Company Incorporation',
              serviceType: 'company_incorporation',
              qcApprovedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              qcApprovedBy: 'Senior QC',
              qualityScore: 98,
              reviewNotes: 'Incorporation documents verified. CIN issued.',
              priority: 'medium',
              status: 'ready_for_delivery',
              deliverables: [
                { id: 'd4', name: 'Certificate of Incorporation', type: 'pdf', size: '350 KB', isReady: true, isOfficial: true },
                { id: 'd5', name: 'MOA & AOA', type: 'pdf', size: '1.2 MB', isReady: true, isOfficial: true },
                { id: 'd6', name: 'Director DIN Letters', type: 'pdf', size: '180 KB', isReady: true, isOfficial: true }
              ],
              completionSummary: 'Private Limited company incorporated. CIN: U72900KA2025PTC123456',
              nextSteps: ['Apply for PAN/TAN', 'Open bank account', 'Setup compliance calendar'],
              estimatedDeliveryDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
            }
          ],
          stats: {
            readyForDelivery: 12,
            inProgress: 5,
            delivered: 28,
            confirmed: 45,
            avgDeliveryTime: 2.5,
            deliverySuccessRate: 98.5
          }
        };
      }
      return response.json();
    }
  });

  // Initiate delivery mutation
  const initiateDeliveryMutation = useMutation({
    mutationFn: async (data: {
      handoffId: number;
      deliveryMethod: string;
      deliveryNotes: string;
      includeDocuments: string[];
      customMessage: string;
    }) => {
      return apiRequest('POST', `/api/ops/delivery-handoff/${data.handoffId}/initiate`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Delivery Initiated',
        description: 'The delivery process has been started. Client will be notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['qc-delivery-handoff'] });
      setIsHandoffDialogOpen(false);
      setSelectedItem(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to initiate delivery. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setDeliveryNotes('');
    setDeliveryMethod('email');
    setIncludeDocuments([]);
    setCustomMessage('');
  };

  const handleOpenHandoff = (item: HandoffItem) => {
    setSelectedItem(item);
    setIncludeDocuments(item.deliverables.filter(d => d.isReady).map(d => d.id));
    setIsHandoffDialogOpen(true);
  };

  const handleInitiateDelivery = () => {
    if (!selectedItem) return;

    initiateDeliveryMutation.mutate({
      handoffId: selectedItem.id,
      deliveryMethod,
      deliveryNotes,
      includeDocuments,
      customMessage
    });
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const filteredItems = handoffData?.items.filter(item => {
    const matchesSearch = item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesTab = selectedTab === 'ready' ? item.status === 'ready_for_delivery' :
      selectedTab === 'in_progress' ? ['delivered', 'awaiting_client_confirmation'].includes(item.status) :
      item.status === 'completed';
    return matchesSearch && matchesPriority && matchesTab;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/operations">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-600" />
                QC to Delivery Handoff
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Manage QC-approved services ready for client delivery
              </p>
            </div>
          </div>
          <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Ready for Delivery</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {handoffData?.stats.readyForDelivery || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {handoffData?.stats.inProgress || 0}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">
                    {handoffData?.stats.delivered || 0}
                  </p>
                </div>
                <Send className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Confirmed</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {handoffData?.stats.confirmed || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg Delivery</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {handoffData?.stats.avgDeliveryTime || 0}h
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {handoffData?.stats.deliverySuccessRate || 0}%
                  </p>
                </div>
                <Star className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by client name or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40" data-testid="select-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setPriorityFilter('all');
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ready" data-testid="tab-ready">
              <Package className="h-4 w-4 mr-2" />
              Ready ({handoffData?.stats.readyForDelivery || 0})
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              <Truck className="h-4 w-4 mr-2" />
              In Progress ({handoffData?.stats.inProgress || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed ({(handoffData?.stats.delivered || 0) + (handoffData?.stats.confirmed || 0)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4 mt-6">
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No items found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedTab === 'ready' && 'No QC-approved items ready for delivery'}
                    {selectedTab === 'in_progress' && 'No deliveries in progress'}
                    {selectedTab === 'completed' && 'No completed deliveries in the current filter'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{item.clientName}</h3>
                            <Badge className={PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}>
                              {item.priority}
                            </Badge>
                            <Badge className={STATUS_COLORS[item.status]}>
                              {STATUS_LABELS[item.status]}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {item.serviceName}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              QC Score: {item.qualityScore}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Approved {getTimeAgo(item.qcApprovedAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-gray-500">
                              <Mail className="h-4 w-4" />
                              {item.clientEmail}
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Phone className="h-4 w-4" />
                              {item.clientPhone}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Deliverables:</span>
                            {item.deliverables.slice(0, 3).map((doc) => (
                              <Badge key={doc.id} variant="outline" className="text-xs">
                                {doc.isOfficial && <Shield className="h-3 w-3 mr-1" />}
                                {doc.name}
                              </Badge>
                            ))}
                            {item.deliverables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.deliverables.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {item.status === 'ready_for_delivery' && (
                            <Button
                              onClick={() => handleOpenHandoff(item)}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-initiate-${item.id}`}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Initiate Delivery
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-view-${item.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Handoff Dialog */}
        <Dialog open={isHandoffDialogOpen} onOpenChange={setIsHandoffDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Initiate Delivery for {selectedItem?.clientName}
              </DialogTitle>
              <DialogDescription>
                Package and send deliverables to the client
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-6">
                {/* Service Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Service Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Service</Label>
                        <p className="text-gray-600 dark:text-gray-300">{selectedItem.serviceName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Quality Score</Label>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedItem.qualityScore} className="flex-1" />
                          <span className="font-semibold">{selectedItem.qualityScore}%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Completion Summary</Label>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {selectedItem.completionSummary}
                      </p>
                    </div>
                    {selectedItem.nextSteps.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Next Steps for Client</Label>
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300">
                          {selectedItem.nextSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deliverables Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Deliverables</CardTitle>
                    <CardDescription>Choose which documents to include in the delivery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedItem.deliverables.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={doc.id}
                              checked={includeDocuments.includes(doc.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setIncludeDocuments([...includeDocuments, doc.id]);
                                } else {
                                  setIncludeDocuments(includeDocuments.filter(id => id !== doc.id));
                                }
                              }}
                              disabled={!doc.isReady}
                              data-testid={`checkbox-doc-${doc.id}`}
                            />
                            <div>
                              <Label htmlFor={doc.id} className="flex items-center gap-2 cursor-pointer">
                                <FileText className="h-4 w-4" />
                                {doc.name}
                                {doc.isOfficial && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Official
                                  </Badge>
                                )}
                              </Label>
                              <p className="text-xs text-gray-500">{doc.size}</p>
                            </div>
                          </div>
                          {doc.isReady ? (
                            <Badge className="bg-green-100 text-green-800">Ready</Badge>
                          ) : (
                            <Badge variant="destructive">Not Ready</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="delivery-method">Delivery Method</Label>
                      <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                        <SelectTrigger data-testid="select-delivery-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              WhatsApp
                            </div>
                          </SelectItem>
                          <SelectItem value="portal">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Portal Only
                            </div>
                          </SelectItem>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4" />
                              All Channels
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="custom-message">Custom Message to Client (Optional)</Label>
                      <Textarea
                        id="custom-message"
                        placeholder="Add a personalized message for the client..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        data-testid="textarea-custom-message"
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery-notes">Internal Delivery Notes</Label>
                      <Textarea
                        id="delivery-notes"
                        placeholder="Add notes for internal reference..."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        data-testid="textarea-delivery-notes"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsHandoffDialogOpen(false);
                      resetForm();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInitiateDelivery}
                    disabled={
                      initiateDeliveryMutation.isPending ||
                      includeDocuments.length === 0
                    }
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-confirm-delivery"
                  >
                    {initiateDeliveryMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Delivery
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
