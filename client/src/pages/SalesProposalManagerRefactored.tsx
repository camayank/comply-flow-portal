import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Plus, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target,
  Clock,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  Send,
  Download,
  Upload
} from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { useStandardMutation } from '@/hooks/useStandardMutation';
import { useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';
import { ProposalForm } from '../components/proposals/ProposalForm';
import { ProposalsList } from '../components/proposals/ProposalsList';
import { BulkUploadDialog } from '../components/BulkUploadDialog';
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
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-500' }
];

export default function SalesProposalManagerRefactored() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState<SalesProposal | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'pending' | 'approved' | 'converted'>('all');

  // Fetch proposals with filters
  const proposalsQuery = useStandardQuery<ProposalsResponse>({
    queryKey: ['proposals', { search: searchTerm, status: statusFilter, page: currentPage, viewMode }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (viewMode !== 'all') params.append('viewMode', viewMode);
      
      return get<{ data: ProposalsResponse }>(`/api/proposals?${params.toString()}`).then(res => res.data);
    },
    emptyState: {
      title: 'No proposals found',
      description: 'Create your first sales proposal to get started.',
    },
  });

  // Fetch dashboard statistics
  const statsQuery = useStandardQuery<ProposalDashboardStats>({
    queryKey: ['proposals-dashboard-stats'],
    queryFn: () => get<{ data: ProposalDashboardStats }>('/api/proposals/stats/dashboard').then(res => res.data),
  });

  // Create proposal mutation
  const queryClient = useQueryClient();
  const createMutation = useStandardMutation({
    mutationFn: (proposalData: any) => post('/api/proposals', proposalData),
    successMessage: 'Proposal created successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update proposal mutation
  const updateMutation = useStandardMutation({
    mutationFn: ({ id, proposalData }: { id: number; proposalData: any }) => 
      put(`/api/proposals/${id}`, proposalData),
    successMessage: 'Proposal updated successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
      setIsEditDialogOpen(false);
      setSelectedProposal(null);
    }
  });

  // Delete proposal mutation
  const deleteMutation = useStandardMutation({
    mutationFn: (id: number) => del(`/api/proposals/${id}`),
    successMessage: 'Proposal deleted successfully',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-dashboard-stats'] });
    }
  });

  // Send proposal mutation
  const sendMutation = useStandardMutation({
    mutationFn: (id: number) => post(`/api/proposals/${id}/send`, {}),
    successMessage: 'Proposal sent to client',
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
      deleteMutation.mutate(id);
    }
  };

  const handleSendProposal = (id: number) => {
    if (confirm('Are you sure you want to send this proposal to the client?')) {
      sendMutation.mutate(id);
    }
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

  const handleBulkUpload = async (data: any[]) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < data.length; i++) {
      try {
        await createMutation.mutateAsync(data[i]);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error.message || 'Upload failed'}`);
      }
    }

    return results;
  };

  const dashboardStats = statsQuery.data;

  return (
    <>
      <PageLayout
        title="Sales Proposal Management"
        subtitle="Manage proposals from creation to conversion"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Proposal
            </Button>
          </div>
        }
      >
        {/* Dashboard Stats */}
        {statsQuery.render((dashboardStats) => (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Total Proposals</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {dashboardStats.totalProposals || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Total Value</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {formatCurrency(dashboardStats?.totalValue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {dashboardStats?.conversionRate || 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {dashboardStats?.pendingApprovals || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Proposals List with Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Proposals</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="converted">Converted</TabsTrigger>
          </TabsList>

          <TabsContent value={viewMode} className="space-y-4">
            {proposalsQuery.render((data) => (
              <ProposalsList
                proposals={data.proposals || []}
                onEdit={handleEditProposal}
                onDelete={handleDeleteProposal}
                onSend={handleSendProposal}
                onPageChange={() => {}}
                getStatusInfo={getStatusInfo}
                formatCurrency={formatCurrency}
              />
            ))}
          </TabsContent>
        </Tabs>
      </PageLayout>

      {/* Create/Edit Proposal Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedProposal(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProposalForm
            initialData={selectedProposal || undefined}
            onSubmit={(data) => {
              if (isEditDialogOpen && selectedProposal) {
                updateMutation.mutate({ id: selectedProposal.id, proposalData: data });
              } else {
                createMutation.mutate(data);
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
            executives={[]}
            statuses={[]}
            qualifiedStatuses={[]}
            paymentStatuses={[]}
            selectedLead={null}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        title="Bulk Upload Proposals"
        description="Upload a CSV or Excel file with proposal data"
        templateHeaders={['leadId', 'salesExecutive', 'totalAmount', 'validityDays']}
        entityName="proposals"
        onUpload={handleBulkUpload}
      />
    </>
  );
}
