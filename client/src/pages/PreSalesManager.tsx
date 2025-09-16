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
import { 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Users, 
  Target,
  Clock,
  Edit,
  Eye,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { LeadForm } from '../components/leads/LeadForm';
import { LeadsList } from '../components/leads/LeadsList';
import { type LeadEnhanced } from '@shared/schema';

interface LeadsResponse {
  leads: LeadEnhanced[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: Record<string, number>;
}

interface DashboardStats {
  stageDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  totalLeads: number;
  recentLeads: number;
  conversionRate: number;
}

const LEAD_STAGES = [
  { value: 'hot_lead', label: 'Hot Lead', color: 'bg-red-500' },
  { value: 'warm_lead', label: 'Warm Lead', color: 'bg-orange-500' },
  { value: 'cold_lead', label: 'Cold Lead', color: 'bg-blue-500' },
  { value: 'not_answered', label: 'Not Answered', color: 'bg-gray-500' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' }
];

const LEAD_SOURCES = [
  'Google Ads',
  'Facebook Ads', 
  'Referral',
  'Website',
  'Cold Call',
  'WhatsApp',
  'Partnership',
  'Direct'
];

export default function PreSalesManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<LeadEnhanced | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch leads with filters and pagination
  const { data: leadsData, isLoading } = useQuery<LeadsResponse>({
    queryKey: ['leads', { search: searchTerm, stage: stageFilter, source: sourceFilter, page: currentPage }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (stageFilter) params.append('stage', stageFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      
      const response = await fetch(`/api/leads?${params.toString()}`);
      return response.json();
    }
  });

  // Fetch dashboard statistics
  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ['leads-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/dashboard');
      return response.json();
    }
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-dashboard-stats'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, leadData }: { id: number; leadData: any }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-dashboard-stats'] });
      setIsEditDialogOpen(false);
      setSelectedLead(null);
    }
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-dashboard-stats'] });
    }
  });

  const handleEditLead = (lead: LeadEnhanced) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleDeleteLead = (id: number) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(id);
    }
  };

  const getStageInfo = (stage: string) => {
    return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="presales-manager">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Pre-Sales Lead Management
          </h1>
          <p className="text-muted-foreground">
            Manage leads from acquisition to conversion
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead to the pre-sales pipeline
              </DialogDescription>
            </DialogHeader>
            <LeadForm 
              onSubmit={(data) => createLeadMutation.mutate(data)}
              isLoading={createLeadMutation.isPending}
              sources={LEAD_SOURCES}
              stages={LEAD_STAGES}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="stat-total-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalLeads}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-recent-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Leads (7 days)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.recentLeads}</div>
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

          <Card data-testid="stat-hot-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.stageDistribution?.hot_lead || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-leads"
                />
              </div>
            </div>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-stage-filter">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_stages">All Stages</SelectItem>
                {LEAD_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-source-filter">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_sources">All Sources</SelectItem>
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

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Pipeline</CardTitle>
          <CardDescription>
            {leadsData?.pagination.total || 0} total leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-leads">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <LeadsList 
              leads={leadsData?.leads || []}
              pagination={leadsData?.pagination}
              onEdit={handleEditLead}
              onDelete={handleDeleteLead}
              onPageChange={setCurrentPage}
              getStageInfo={getStageInfo}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update lead information and stage
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <LeadForm 
              initialData={selectedLead}
              onSubmit={(data) => updateLeadMutation.mutate({ 
                id: selectedLead.id, 
                leadData: data 
              })}
              isLoading={updateLeadMutation.isPending}
              sources={LEAD_SOURCES}
              stages={LEAD_STAGES}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}