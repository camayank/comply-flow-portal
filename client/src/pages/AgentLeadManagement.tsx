import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Upload,
  UserPlus,
} from 'lucide-react';
import { BulkUploadDialogEnhanced, ColumnDefinition, BulkUploadResult } from '@/components/BulkUploadDialogEnhanced';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { SkeletonList } from '@/components/ui/skeleton-loader';
import { EmptyList, EmptySearchResults } from '@/components/ui/empty-state';
import { DashboardLayout, PageShell } from '@/layouts';
import { useAuth } from '@/hooks/useAuth';
import { AGENT_NAVIGATION } from '@/config/agent-navigation';

const LEAD_STAGES = {
  NEW: 'new',
  HOT_LEAD: 'hot_lead',
  WARM_LEAD: 'warm_lead',
  COLD_LEAD: 'cold_lead',
  CONTACTED: 'contacted',
  CONVERTED: 'converted',
  LOST: 'lost',
};

const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Google Ads',
  'Facebook Ads',
  'LinkedIn',
  'Cold Call',
  'Email Campaign',
  'Event',
  'Other'
];

// Bulk upload column definitions for leads
const leadBulkColumns: ColumnDefinition[] = [
  { key: 'contactName', label: 'Contact Name', type: 'text', required: true, placeholder: 'John Doe' },
  { key: 'companyName', label: 'Company Name', type: 'text', placeholder: 'ABC Corp' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
  { key: 'phone', label: 'Phone', type: 'phone', required: true, placeholder: '+91 9876543210' },
  { key: 'serviceInterested', label: 'Service Interested', type: 'text', required: true, placeholder: 'GST Registration' },
  { key: 'leadSource', label: 'Lead Source', type: 'select', options: LEAD_SOURCES.map(s => ({ value: s, label: s })) },
  { key: 'leadStage', label: 'Lead Stage', type: 'select', options: [
    { value: 'new', label: 'New' },
    { value: 'hot_lead', label: 'Hot Lead' },
    { value: 'warm_lead', label: 'Warm Lead' },
    { value: 'cold_lead', label: 'Cold Lead' },
  ]},
  { key: 'city', label: 'City', type: 'text', placeholder: 'Mumbai' },
  { key: 'state', label: 'State', type: 'text', placeholder: 'Maharashtra' },
  { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Additional notes' },
];

export default function AgentLeadManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [newLead, setNewLead] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    serviceInterested: '',
    leadSource: '',
    leadStage: LEAD_STAGES.NEW,
    notes: '',
    city: '',
    state: '',
  });

  // User config for DashboardLayout
  const agentUser = user ? {
    name: user.email || 'Agent User',
    email: user.email || '',
  } : undefined;

  // Use agent-specific API endpoints
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['/api/agent/leads', { stage: stageFilter !== 'all' ? stageFilter : undefined }],
  });

  // Get agent stats for dashboard cards
  const { data: agentStats } = useQuery({
    queryKey: ['/api/agent/stats'],
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLead) => {
      return apiRequest('POST', '/api/agent/leads', {
        ...leadData,
        stage: leadData.leadStage, // Map leadStage to stage for agent API
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/stats'] });
      toast({
        title: 'Success',
        description: 'Lead created successfully',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create lead',
        variant: 'destructive',
      });
    },
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: number; stage: string }) => {
      return apiRequest('PATCH', `/api/agent/leads/${leadId}`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/stats'] });
      toast({
        title: 'Success',
        description: 'Lead status updated',
      });
    },
  });

  const resetForm = () => {
    setNewLead({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      serviceInterested: '',
      leadSource: '',
      leadStage: LEAD_STAGES.NEW,
      notes: '',
      city: '',
      state: '',
    });
  };

  const handleCreateLead = () => {
    if (!newLead.contactName || !newLead.phone || !newLead.serviceInterested) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createLeadMutation.mutate(newLead);
  };

  const handleBulkUpload = async (data: Record<string, any>[]): Promise<BulkUploadResult> => {
    try {
      const response = await fetch('/api/agent/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: data.map(lead => ({ ...lead, stage: lead.leadStage || 'new' })) }),
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/agent/leads'] });
        queryClient.invalidateQueries({ queryKey: ['/api/agent/stats'] });
        return { success: result.created || data.length, failed: result.failed || 0, errors: result.errors || [] };
      }
      return { success: 0, failed: data.length, errors: [result.message || 'Bulk upload failed'] };
    } catch (error: any) {
      return { success: 0, failed: data.length, errors: [error.message || 'Network error'] };
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGES.HOT_LEAD:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case LEAD_STAGES.WARM_LEAD:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case LEAD_STAGES.COLD_LEAD:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case LEAD_STAGES.CONTACTED:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case LEAD_STAGES.CONVERTED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case LEAD_STAGES.LOST:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case LEAD_STAGES.CONVERTED:
        return <CheckCircle className="h-4 w-4" />;
      case LEAD_STAGES.LOST:
        return <XCircle className="h-4 w-4" />;
      case LEAD_STAGES.CONTACTED:
        return <Phone className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const leads = (leadsData as any)?.leads || [];
  const stats = (agentStats as any)?.leadsByStage || {};
  const totalLeads = (agentStats as any)?.totalLeads || 0;

  return (
    <DashboardLayout
      navigation={AGENT_NAVIGATION}
      user={agentUser}
      logo={
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">Agent</span>
        </div>
      }
    >
      <PageShell
        title="Lead Management"
        subtitle="Track and convert your leads"
        breadcrumbs={[
          { label: "Agent Portal", href: "/agent" },
          { label: "Lead Management" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)} data-testid="button-bulk-upload-leads">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-lead">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Lead</DialogTitle>
                  <DialogDescription>
                    Add a new lead to your pipeline
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">
                        Contact Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="contactName"
                        data-testid="input-contact-name"
                        value={newLead.contactName}
                        onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        data-testid="input-company-name"
                        value={newLead.companyName}
                        onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-email"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        data-testid="input-phone"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serviceInterested">
                        Service Interested <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="serviceInterested"
                        data-testid="input-service-interested"
                        value={newLead.serviceInterested}
                        onChange={(e) => setNewLead({ ...newLead, serviceInterested: e.target.value })}
                        placeholder="GST Registration"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leadSource">Lead Source</Label>
                      <Select
                        value={newLead.leadSource}
                        onValueChange={(value) => setNewLead({ ...newLead, leadSource: value })}
                      >
                        <SelectTrigger data-testid="select-lead-source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_SOURCES.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        data-testid="input-city"
                        value={newLead.city}
                        onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                        placeholder="Mumbai"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        data-testid="input-state"
                        value={newLead.state}
                        onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                        placeholder="Maharashtra"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadStage">Lead Stage</Label>
                    <Select
                      value={newLead.leadStage}
                      onValueChange={(value) => setNewLead({ ...newLead, leadStage: value })}
                    >
                      <SelectTrigger data-testid="select-lead-stage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LEAD_STAGES.NEW}>New</SelectItem>
                        <SelectItem value={LEAD_STAGES.HOT_LEAD}>Hot Lead</SelectItem>
                        <SelectItem value={LEAD_STAGES.WARM_LEAD}>Warm Lead</SelectItem>
                        <SelectItem value={LEAD_STAGES.COLD_LEAD}>Cold Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      data-testid="textarea-notes"
                      value={newLead.notes}
                      onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                      placeholder="Additional details about the lead..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateLead}
                    disabled={createLeadMutation.isPending}
                    data-testid="button-save-lead"
                  >
                    {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Leads</CardDescription>
              <CardTitle className="text-2xl">{totalLeads}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>New Leads</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.new || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Contacted</CardDescription>
              <CardTitle className="text-2xl text-purple-600">{stats.contacted || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Converted</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.converted || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  data-testid="input-search-leads"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger data-testid="select-stage-filter">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value={LEAD_STAGES.HOT_LEAD}>Hot Leads</SelectItem>
                  <SelectItem value={LEAD_STAGES.WARM_LEAD}>Warm Leads</SelectItem>
                  <SelectItem value={LEAD_STAGES.COLD_LEAD}>Cold Leads</SelectItem>
                  <SelectItem value={LEAD_STAGES.CONTACTED}>Contacted</SelectItem>
                  <SelectItem value={LEAD_STAGES.CONVERTED}>Converted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads List */}
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              {leads.length} lead{leads.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonList items={4} />
            ) : leads.length === 0 ? (
              searchQuery || stageFilter !== 'all' || sourceFilter !== 'all' ? (
                <EmptySearchResults
                  searchTerm={searchQuery}
                  onClearSearch={() => {
                    setSearchQuery('');
                    setStageFilter('all');
                    setSourceFilter('all');
                  }}
                />
              ) : (
                <EmptyList
                  title="No leads found"
                  description="Start by adding your first lead to the pipeline and track your conversion progress"
                  actionLabel="Add Your First Lead"
                  onAction={() => setIsCreateDialogOpen(true)}
                />
              )
            ) : (
              <div className="space-y-3">
                {leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`lead-card-${lead.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {lead.companyName || lead.contactName}
                          </h3>
                          <Badge className={getStageColor(lead.stage || lead.leadStage)} variant="secondary">
                            {getStageIcon(lead.stage || lead.leadStage)}
                            <span className="ml-1">
                              {(lead.stage || lead.leadStage)?.replace('_', ' ').toUpperCase()}
                            </span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {lead.phone}
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {lead.serviceInterested || 'Multiple services'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Select
                          value={lead.stage || lead.leadStage}
                          onValueChange={(value) =>
                            updateLeadStageMutation.mutate({ leadId: lead.id, stage: value })
                          }
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-stage-${lead.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={LEAD_STAGES.HOT_LEAD}>Hot Lead</SelectItem>
                            <SelectItem value={LEAD_STAGES.WARM_LEAD}>Warm Lead</SelectItem>
                            <SelectItem value={LEAD_STAGES.COLD_LEAD}>Cold Lead</SelectItem>
                            <SelectItem value={LEAD_STAGES.CONTACTED}>Contacted</SelectItem>
                            <SelectItem value={LEAD_STAGES.CONVERTED}>Converted</SelectItem>
                            <SelectItem value={LEAD_STAGES.LOST}>Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          data-testid={`button-view-${lead.id}`}
                          onClick={() => navigate(`/agent/leads/${lead.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Upload Dialog */}
        <BulkUploadDialogEnhanced
          open={bulkUploadOpen}
          onOpenChange={setBulkUploadOpen}
          title="Bulk Import Leads"
          description="Upload multiple leads at once using Excel or CSV file"
          columns={leadBulkColumns}
          onUpload={handleBulkUpload}
          sampleData={[
            { contactName: 'John Doe', companyName: 'ABC Corp', email: 'john@abc.com', phone: '+91 9876543210', serviceInterested: 'GST Registration', leadSource: 'Website', leadStage: 'hot_lead', city: 'Mumbai', state: 'Maharashtra', notes: 'Interested in premium plan' },
            { contactName: 'Jane Smith', companyName: 'XYZ Ltd', email: 'jane@xyz.com', phone: '+91 8765432109', serviceInterested: 'Company Incorporation', leadSource: 'Referral', leadStage: 'warm_lead', city: 'Delhi', state: 'Delhi', notes: 'Referred by existing client' },
          ]}
        />
      </PageShell>
    </DashboardLayout>
  );
}
