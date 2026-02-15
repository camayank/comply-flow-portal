import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Plus, ArrowRight, GitBranch, Clock, AlertCircle,
  CheckCircle, Play, Pause, X, Eye, EyeOff, Bell, Users,
  Copy, Trash2, Edit, Save, RefreshCw, Search, Filter,
  ChevronDown, ChevronRight, Workflow, ListChecks, History
} from 'lucide-react';

interface ServiceStatus {
  id: number;
  serviceKey: string;
  statusCode: string;
  statusName: string;
  statusDescription: string;
  statusCategory: string;
  isTerminal: boolean;
  displayOrder: number;
  color: string;
  icon: string;
  autoProgress: boolean;
  autoProgressDelayHours: number | null;
  requiresApproval: boolean;
  requiresDocument: boolean;
  slaHours: number | null;
  triggerTasks: boolean;
  triggerNotification: boolean;
  defaultAssigneeRole: string | null;
  escalateToRole: string | null;
  clientVisible: boolean;
  clientStatusLabel: string | null;
  clientMessage: string | null;
  isActive: boolean;
}

interface TransitionRule {
  id: number;
  serviceKey: string;
  fromStatusCode: string;
  toStatusCode: string;
  transitionName: string;
  transitionDescription: string;
  allowedRoles: string[];
  requiresApproval: boolean;
  buttonLabel: string;
  buttonColor: string;
  confirmationRequired: boolean;
  confirmationMessage: string;
  isActive: boolean;
}

interface TransitionHistory {
  id: number;
  serviceRequestId: number;
  fromStatusCode: string | null;
  toStatusCode: string;
  fromStatusName: string | null;
  toStatusName: string;
  changedByName: string;
  changedByRole: string;
  changedAt: string;
  transitionReason: string | null;
  notes: string | null;
  durationInPreviousStatus: number | null;
}

interface ServiceSummary {
  serviceKey: string;
  name: string;
  category: string;
  periodicity: string;
  statusCount: number;
  hasCustomStatuses: boolean;
}

const STATUS_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange' },
  { value: '#6b7280', label: 'Gray' },
];

const ASSIGNEE_ROLES = [
  { value: 'ops_executive', label: 'Ops Executive' },
  { value: 'qc_reviewer', label: 'QC Reviewer' },
  { value: 'admin', label: 'Admin' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'super_admin', label: 'Super Admin' },
];

const STATUS_CATEGORIES = [
  { value: 'process', label: 'Process Step' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'terminal', label: 'Terminal (End)' },
];

export default function StatusManagement() {
  const [selectedService, setSelectedService] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ServiceStatus | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all services with status summary
  const { data: serviceSummary, isLoading: loadingServices } = useQuery({
    queryKey: ['/api/status-management/services/status-summary'],
    refetchOnWindowFocus: false,
  });

  // Fetch statuses for selected service
  const { data: statusesData, isLoading: loadingStatuses } = useQuery({
    queryKey: ['/api/status-management/services', selectedService, 'statuses'],
    enabled: !!selectedService,
  });

  // Fetch transition rules for selected service
  const { data: transitionsData, isLoading: loadingTransitions } = useQuery({
    queryKey: ['/api/status-management/services', selectedService, 'transitions'],
    enabled: !!selectedService,
  });

  // Create status mutation
  const createStatusMutation = useMutation({
    mutationFn: async (newStatus: Partial<ServiceStatus>) => {
      const response = await fetch(`/api/status-management/services/${selectedService}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus),
      });
      if (!response.ok) throw new Error('Failed to create status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status-management/services', selectedService, 'statuses'] });
      toast({ title: 'Status created successfully' });
      setShowCreateDialog(false);
    },
    onError: () => {
      toast({ title: 'Failed to create status', variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: ServiceStatus) => {
      const response = await fetch(`/api/status-management/statuses/${status.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status-management/services', selectedService, 'statuses'] });
      toast({ title: 'Status updated successfully' });
      setEditingStatus(null);
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    },
  });

  // Delete status mutation
  const deleteStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      const response = await fetch(`/api/status-management/statuses/${statusId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status-management/services', selectedService, 'statuses'] });
      toast({ title: 'Status deactivated' });
    },
    onError: () => {
      toast({ title: 'Failed to delete status', variant: 'destructive' });
    },
  });

  // Initialize defaults mutation
  const initializeDefaultsMutation = useMutation({
    mutationFn: async (serviceKey: string) => {
      const response = await fetch(`/api/status-management/services/${serviceKey}/initialize-defaults`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to initialize defaults');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status-management/services', selectedService, 'statuses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status-management/services/status-summary'] });
      toast({ title: 'Default statuses initialized' });
    },
    onError: () => {
      toast({ title: 'Failed to initialize defaults', variant: 'destructive' });
    },
  });

  // Copy statuses mutation
  const copyStatusesMutation = useMutation({
    mutationFn: async ({ source, target }: { source: string; target: string }) => {
      const response = await fetch(`/api/status-management/services/${source}/copy-to/${target}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to copy statuses');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status-management/services/status-summary'] });
      toast({ title: 'Statuses copied successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to copy statuses', variant: 'destructive' });
    },
  });

  const services = serviceSummary?.services || [];
  const statuses = statusesData?.statuses || [];
  const transitions = transitionsData?.transitions || [];
  const isDefaultStatuses = statusesData?.isDefault || false;

  // Filter services
  const filteredServices = services.filter((service: ServiceSummary) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.serviceKey.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(services.map((s: ServiceSummary) => s.category))];

  // New status form state
  const [newStatus, setNewStatus] = useState<Partial<ServiceStatus>>({
    statusCode: '',
    statusName: '',
    statusDescription: '',
    statusCategory: 'process',
    isTerminal: false,
    color: '#6b7280',
    slaHours: null,
    triggerTasks: true,
    triggerNotification: true,
    clientVisible: true,
  });

  const handleCreateStatus = () => {
    createStatusMutation.mutate(newStatus);
  };

  const handleUpdateStatus = () => {
    if (editingStatus) {
      updateStatusMutation.mutate(editingStatus);
    }
  };

  const renderStatusFlow = () => {
    if (!statuses.length) return null;

    return (
      <div className="flex items-center gap-2 overflow-x-auto py-4 px-2">
        {statuses
          .sort((a: ServiceStatus, b: ServiceStatus) => a.displayOrder - b.displayOrder)
          .map((status: ServiceStatus, index: number) => (
            <div key={status.statusCode} className="flex items-center">
              <div
                className="flex flex-col items-center min-w-[120px] p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                style={{ borderColor: status.color }}
                onClick={() => setExpandedStatus(expandedStatus === status.statusCode ? null : status.statusCode)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
                  style={{ backgroundColor: status.color }}
                >
                  {status.displayOrder}
                </div>
                <span className="text-xs font-medium text-center">{status.statusName}</span>
                <Badge variant={status.isTerminal ? 'destructive' : 'outline'} className="mt-1 text-[10px]">
                  {status.statusCategory}
                </Badge>
                {status.clientVisible && (
                  <Eye className="h-3 w-3 mt-1 text-muted-foreground" title="Visible to client" />
                )}
              </div>
              {index < statuses.length - 1 && !status.isTerminal && (
                <ArrowRight className="h-5 w-5 text-muted-foreground mx-2 flex-shrink-0" />
              )}
            </div>
          ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Status Management</h1>
          <p className="text-muted-foreground">
            Configure workflow statuses and transitions for each service
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Service List Panel */}
        <div className="col-span-4">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Services
              </CardTitle>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-380px)]">
                {loadingServices ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : (
                  <div className="divide-y">
                    {filteredServices.map((service: ServiceSummary) => (
                      <div
                        key={service.serviceKey}
                        className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedService === service.serviceKey ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedService(service.serviceKey)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.serviceKey}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={service.hasCustomStatuses ? 'default' : 'secondary'}>
                              {service.statusCount || 'Default'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{service.periodicity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Panel */}
        <div className="col-span-8">
          {!selectedService ? (
            <Card className="h-[calc(100vh-200px)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Workflow className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Select a service to manage its workflow statuses</p>
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="statuses" className="space-y-4">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="statuses" className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Statuses
                  </TabsTrigger>
                  <TabsTrigger value="transitions" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Transitions
                  </TabsTrigger>
                  <TabsTrigger value="flow" className="flex items-center gap-2">
                    <Workflow className="h-4 w-4" />
                    Flow Diagram
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  {isDefaultStatuses && (
                    <Button
                      variant="outline"
                      onClick={() => initializeDefaultsMutation.mutate(selectedService)}
                      disabled={initializeDefaultsMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Initialize Custom Statuses
                    </Button>
                  )}
                  {!isDefaultStatuses && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Status
                    </Button>
                  )}
                </div>
              </div>

              {/* Statuses Tab */}
              <TabsContent value="statuses" className="space-y-4">
                {isDefaultStatuses && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Using Default Statuses</p>
                      <p className="text-sm text-yellow-600">
                        This service is using system default statuses. Click "Initialize Custom Statuses" to customize.
                      </p>
                    </div>
                  </div>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Workflow Statuses</CardTitle>
                    <CardDescription>
                      Define the status progression for this service
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStatuses ? (
                      <div className="text-center py-8 text-muted-foreground">Loading statuses...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead>Triggers</TableHead>
                            <TableHead>Client View</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statuses
                            .sort((a: ServiceStatus, b: ServiceStatus) => a.displayOrder - b.displayOrder)
                            .map((status: ServiceStatus) => (
                              <TableRow key={status.statusCode}>
                                <TableCell>
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                    style={{ backgroundColor: status.color }}
                                  >
                                    {status.displayOrder}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{status.statusName}</p>
                                    <p className="text-xs text-muted-foreground">{status.statusCode}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={status.isTerminal ? 'destructive' : 'outline'}>
                                    {status.statusCategory}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {status.slaHours ? (
                                    <span className="flex items-center gap-1 text-sm">
                                      <Clock className="h-3 w-3" />
                                      {status.slaHours}h
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {status.triggerTasks && (
                                      <Badge variant="secondary" className="text-[10px]">Tasks</Badge>
                                    )}
                                    {status.triggerNotification && (
                                      <Badge variant="secondary" className="text-[10px]">Notify</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {status.clientVisible ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <Eye className="h-4 w-4" />
                                      <span className="text-xs">{status.clientStatusLabel || 'Visible'}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <EyeOff className="h-4 w-4" />
                                      <span className="text-xs">Hidden</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {!isDefaultStatuses && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingStatus(status)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteStatusMutation.mutate(status.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transitions Tab */}
              <TabsContent value="transitions" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">Transition Rules</CardTitle>
                        <CardDescription>
                          Define valid status transitions and permissions
                        </CardDescription>
                      </div>
                      {!isDefaultStatuses && (
                        <Button onClick={() => setShowTransitionDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Transition
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingTransitions ? (
                      <div className="text-center py-8 text-muted-foreground">Loading transitions...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>From</TableHead>
                            <TableHead></TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Allowed Roles</TableHead>
                            <TableHead>Requirements</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transitions.map((transition: TransitionRule, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant="outline">{transition.fromStatusCode}</Badge>
                              </TableCell>
                              <TableCell>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{transition.toStatusCode}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{transition.transitionName}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(transition.allowedRoles || []).map((role: string) => (
                                    <Badge key={role} variant="secondary" className="text-[10px]">
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {transition.requiresApproval && (
                                    <Badge variant="destructive" className="text-[10px]">Approval</Badge>
                                  )}
                                  {transition.confirmationRequired && (
                                    <Badge variant="secondary" className="text-[10px]">Confirm</Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flow Diagram Tab */}
              <TabsContent value="flow" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Workflow Flow Diagram</CardTitle>
                    <CardDescription>
                      Visual representation of the status progression
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-muted/20 overflow-x-auto">
                      {renderStatusFlow()}
                    </div>

                    {expandedStatus && (
                      <div className="mt-4 p-4 border rounded-lg bg-background">
                        <h4 className="font-medium mb-2">
                          Status Details: {statuses.find((s: ServiceStatus) => s.statusCode === expandedStatus)?.statusName}
                        </h4>
                        {(() => {
                          const status = statuses.find((s: ServiceStatus) => s.statusCode === expandedStatus);
                          if (!status) return null;
                          return (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="text-muted-foreground">Description</Label>
                                <p>{status.statusDescription || 'No description'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Assignee Role</Label>
                                <p>{status.defaultAssigneeRole || 'Not specified'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">SLA Hours</Label>
                                <p>{status.slaHours || 'Not specified'}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Client Message</Label>
                                <p>{status.clientMessage || 'No message configured'}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Create Status Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Status</DialogTitle>
            <DialogDescription>
              Add a new status to the workflow for {selectedService}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statusCode">Status Code</Label>
                <Input
                  id="statusCode"
                  placeholder="e.g., docs_verified"
                  value={newStatus.statusCode}
                  onChange={(e) => setNewStatus({ ...newStatus, statusCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusName">Status Name</Label>
                <Input
                  id="statusName"
                  placeholder="e.g., Documents Verified"
                  value={newStatus.statusName}
                  onChange={(e) => setNewStatus({ ...newStatus, statusName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusDescription">Description</Label>
              <Textarea
                id="statusDescription"
                placeholder="Describe what happens in this status..."
                value={newStatus.statusDescription}
                onChange={(e) => setNewStatus({ ...newStatus, statusDescription: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newStatus.statusCategory}
                  onValueChange={(value) => setNewStatus({ ...newStatus, statusCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={newStatus.color}
                  onValueChange={(value) => setNewStatus({ ...newStatus, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SLA Hours</Label>
                <Input
                  type="number"
                  placeholder="24"
                  value={newStatus.slaHours || ''}
                  onChange={(e) => setNewStatus({ ...newStatus, slaHours: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Trigger Tasks</Label>
                <Switch
                  checked={newStatus.triggerTasks}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, triggerTasks: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Trigger Notifications</Label>
                <Switch
                  checked={newStatus.triggerNotification}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, triggerNotification: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Client Visible</Label>
                <Switch
                  checked={newStatus.clientVisible}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, clientVisible: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Is Terminal Status</Label>
                <Switch
                  checked={newStatus.isTerminal}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, isTerminal: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Assignee Role</Label>
                <Select
                  value={newStatus.defaultAssigneeRole || ''}
                  onValueChange={(value) => setNewStatus({ ...newStatus, defaultAssigneeRole: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNEE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client Status Label</Label>
                <Input
                  placeholder="e.g., Processing"
                  value={newStatus.clientStatusLabel || ''}
                  onChange={(e) => setNewStatus({ ...newStatus, clientStatusLabel: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client Message</Label>
              <Textarea
                placeholder="Message shown to client when at this status..."
                value={newStatus.clientMessage || ''}
                onChange={(e) => setNewStatus({ ...newStatus, clientMessage: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStatus} disabled={createStatusMutation.isPending}>
              {createStatusMutation.isPending ? 'Creating...' : 'Create Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      {editingStatus && (
        <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Status: {editingStatus.statusName}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status Code</Label>
                  <Input value={editingStatus.statusCode} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Status Name</Label>
                  <Input
                    value={editingStatus.statusName}
                    onChange={(e) => setEditingStatus({ ...editingStatus, statusName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingStatus.statusDescription || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, statusDescription: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingStatus.statusCategory}
                    onValueChange={(value) => setEditingStatus({ ...editingStatus, statusCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select
                    value={editingStatus.color}
                    onValueChange={(value) => setEditingStatus({ ...editingStatus, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SLA Hours</Label>
                  <Input
                    type="number"
                    value={editingStatus.slaHours || ''}
                    onChange={(e) => setEditingStatus({ ...editingStatus, slaHours: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>Trigger Tasks</Label>
                  <Switch
                    checked={editingStatus.triggerTasks}
                    onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, triggerTasks: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Trigger Notifications</Label>
                  <Switch
                    checked={editingStatus.triggerNotification}
                    onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, triggerNotification: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Client Visible</Label>
                  <Switch
                    checked={editingStatus.clientVisible}
                    onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, clientVisible: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={editingStatus.isActive}
                    onCheckedChange={(checked) => setEditingStatus({ ...editingStatus, isActive: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Client Message</Label>
                <Textarea
                  value={editingStatus.clientMessage || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, clientMessage: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStatus(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </DashboardLayout>
  );
}
