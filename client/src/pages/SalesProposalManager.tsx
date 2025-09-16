import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Users, 
  Target,
  Clock,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Download,
  ArrowRight,
  Calculator,
  FileCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ProposalForm } from '../components/proposals/ProposalForm';
import { ProposalsList } from '../components/proposals/ProposalsList';
import { type SalesProposal, type LeadEnhanced } from '@shared/schema';

interface ProposalsResponse {
  proposals: SalesProposal[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: Record<string, number>;
}

interface ProposalDashboardStats {
  statusDistribution: Record<string, number>;
  totalProposals: number;
  recentProposals: number;
  totalValue: number;
  conversionRate: number;
  avgProposalValue: number;
  pendingApprovals: number;
}

interface LeadsResponse {
  leads: LeadEnhanced[];
}

const PROPOSAL_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500' },
  { value: 'revised_sent', label: 'Revised Sent', color: 'bg-orange-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'expired', label: 'Expired', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-500' }
];

const QUALIFIED_LEAD_STATUSES = [
  'Initial Contact',
  'Proposal Sent',
  'Follow-up Scheduled',
  'Negotiation',
  'Payment Pending',
  'Contract Signed',
  'Onboarding'
];

const PAYMENT_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'full', label: 'Full' }
];

const SALES_EXECUTIVES = [
  'Rahul Sharma',
  'Pooja Patel', 
  'Amit Kumar',
  'Neha Singh',
  'Karan Verma',
  'Priya Agarwal',
  'Deepak Gupta',
  'Sneha Rajesh'
];

export default function SalesProposalManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateFromLeadDialogOpen, setIsCreateFromLeadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState<SalesProposal | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadEnhanced | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'pending' | 'approved' | 'converted'>('all');

  const queryClient = useQueryClient();

  // Fetch proposals with filters and pagination
  const { data: proposalsData, isLoading } = useQuery<ProposalsResponse>({
    queryKey: ['proposals', { search: searchTerm, status: statusFilter, executive: executiveFilter, page: currentPage, viewMode }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (executiveFilter) params.append('executive', executiveFilter);
      if (viewMode !== 'all') params.append('viewMode', viewMode);
      
      const response = await fetch(`/api/proposals?${params.toString()}`);
      return response.json();
    }
  });

  // Fetch dashboard statistics
  const { data: dashboardStats } = useQuery<ProposalDashboardStats>({
    queryKey: ['proposals-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/proposals/stats/dashboard');
      return response.json();
    }
  });

  // Fetch converted leads for creating proposals
  const { data: availableLeads } = useQuery<LeadsResponse>({
    queryKey: ['leads-for-proposals'],
    queryFn: async () => {
      const response = await fetch('/api/leads?stage=hot_lead,warm_lead&limit=50');
      return response.json();
    },
    enabled: isCreateFromLeadDialogOpen
  });

  // Create proposal mutation
  const createProposalMutation = useMutation({
    mutationFn: async (proposalData: any) => {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
      setIsCreateDialogOpen(false);
      setIsCreateFromLeadDialogOpen(false);
      setSelectedLead(null);
    }
  });

  // Update proposal mutation
  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, proposalData }: { id: number; proposalData: any }) => {
      const response = await fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
      setIsEditDialogOpen(false);
      setSelectedProposal(null);
    }
  });

  // Delete proposal mutation
  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/proposals/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
    }
  });

  // Send proposal mutation
  const sendProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/proposals/${id}/send`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
    }
  });

  const handleEditProposal = (proposal: SalesProposal) => {
    setSelectedProposal(proposal);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProposal = (id: number) => {
    if (confirm('Are you sure you want to delete this proposal?')) {
      deleteProposalMutation.mutate(id);
    }
  };

  const handleSendProposal = (id: number) => {
    if (confirm('Are you sure you want to send this proposal to the client?')) {
      sendProposalMutation.mutate(id);
    }
  };

  const handleCreateFromLead = (lead: LeadEnhanced) => {
    setSelectedLead(lead);
    setIsCreateFromLeadDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const getStatusInfo = (status: string) => {
    return PROPOSAL_STATUSES.find(s => s.value === status) || PROPOSAL_STATUSES[0];
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="proposal-manager">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Sales Proposal Management
          </h1>
          <p className="text-muted-foreground">
            Manage proposals from creation to conversion
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateFromLeadDialogOpen} onOpenChange={setIsCreateFromLeadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-from-lead">
                <ArrowRight className="h-4 w-4 mr-2" />
                From Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Proposal from Lead</DialogTitle>
                <DialogDescription>
                  Select a qualified lead to create a proposal
                </DialogDescription>
              </DialogHeader>
              {availableLeads && (
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {availableLeads.leads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleCreateFromLead(lead)}
                      data-testid={`lead-option-${lead.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{lead.clientName}</h3>
                          <p className="text-sm text-muted-foreground">{lead.serviceInterested}</p>
                          <p className="text-xs text-muted-foreground">
                            Est. Value: {formatCurrency(lead.estimatedValue)}
                          </p>
                        </div>
                        <Badge className={`${getStatusInfo(lead.leadStage || 'new').color} text-white`}>
                          {getStatusInfo(lead.leadStage || 'new').label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-proposal">
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
                <DialogDescription>
                  Create a new sales proposal {selectedLead ? `for ${selectedLead.clientName}` : ''}
                </DialogDescription>
              </DialogHeader>
              <ProposalForm 
                onSubmit={(data) => createProposalMutation.mutate(data)}
                isLoading={createProposalMutation.isPending}
                executives={SALES_EXECUTIVES}
                statuses={PROPOSAL_STATUSES}
                qualifiedStatuses={QUALIFIED_LEAD_STATUSES}
                paymentStatuses={PAYMENT_STATUS}
                selectedLead={selectedLead}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card data-testid="stat-total-proposals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalProposals}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-recent-proposals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent (7 days)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.recentProposals}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-total-value">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalValue)}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-avg-value">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardStats.avgProposalValue)}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.conversionRate}%</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-pending-approvals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.pendingApprovals}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick View Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={viewMode === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('all')}
          data-testid="view-all"
        >
          All Proposals
        </Button>
        <Button 
          variant={viewMode === 'pending' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('pending')}
          data-testid="view-pending"
        >
          Pending Review
        </Button>
        <Button 
          variant={viewMode === 'approved' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('approved')}
          data-testid="view-approved"
        >
          Approved
        </Button>
        <Button 
          variant={viewMode === 'converted' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('converted')}
          data-testid="view-converted"
        >
          Converted
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {PROPOSAL_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sales Executive</Label>
              <Select value={executiveFilter} onValueChange={setExecutiveFilter}>
                <SelectTrigger data-testid="select-executive-filter">
                  <SelectValue placeholder="All executives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All executives</SelectItem>
                  {SALES_EXECUTIVES.map((executive) => (
                    <SelectItem key={executive} value={executive}>
                      {executive}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setExecutiveFilter('');
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proposals</CardTitle>
          <CardDescription>
            {proposalsData?.pagination ? 
              `Showing ${proposalsData.pagination.total} proposal(s)` : 
              'Loading...'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading proposals...</div>
          ) : proposalsData ? (
            <ProposalsList
              proposals={proposalsData.proposals}
              pagination={proposalsData.pagination}
              onEdit={handleEditProposal}
              onDelete={handleDeleteProposal}
              onSend={handleSendProposal}
              onPageChange={setCurrentPage}
              getStatusInfo={getStatusInfo}
              formatCurrency={formatCurrency}
            />
          ) : (
            <div className="text-center py-8" data-testid="no-proposals-message">
              <p className="text-muted-foreground">No proposals found. Create your first proposal to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Proposal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Proposal</DialogTitle>
            <DialogDescription>
              Update proposal details and status
            </DialogDescription>
          </DialogHeader>
          {selectedProposal && (
            <ProposalForm 
              initialData={selectedProposal}
              onSubmit={(data) => updateProposalMutation.mutate({ 
                id: selectedProposal.id, 
                proposalData: data 
              })}
              isLoading={updateProposalMutation.isPending}
              executives={SALES_EXECUTIVES}
              statuses={PROPOSAL_STATUSES}
              qualifiedStatuses={QUALIFIED_LEAD_STATUSES}
              paymentStatuses={PAYMENT_STATUS}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}