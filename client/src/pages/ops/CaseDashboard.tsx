import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  ArrowLeft,
  FileText,
  Clock,
  MessageSquare,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  FilingStatusCard,
  ClientInfoCard,
  SlaCard,
  InternalNotesTab,
} from '@/components/ops';

export default function CaseDashboard() {
  const [, params] = useRoute('/ops/case/:id');
  const caseId = params?.id;
  const { toast } = useToast();

  // Fetch case details
  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['ops-case', caseId],
    queryFn: () => apiRequest('GET', `/api/ops/cases/${caseId}`),
    enabled: !!caseId,
  });

  // Fetch case notes
  const { data: notesData } = useQuery({
    queryKey: ['ops-case-notes', caseId],
    queryFn: () => apiRequest('GET', `/api/ops/cases/${caseId}/notes`),
    enabled: !!caseId,
  });

  // Update filing status mutation
  const updateFilingMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest('PATCH', `/api/ops/cases/${caseId}/filing`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-case', caseId] });
      toast({ title: 'Filing status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update filing status', variant: 'destructive' });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; isClientVisible: boolean }) =>
      apiRequest('POST', `/api/ops/cases/${caseId}/notes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-case-notes', caseId] });
      toast({ title: 'Note added' });
    },
    onError: () => {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    },
  });

  // Update case status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest('PATCH', `/api/service-requests/${caseId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-case', caseId] });
      toast({ title: 'Status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !caseData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-semibold">Case Not Found</h2>
          <Link href="/operations/work-queue">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Queue
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 -mx-4 -mt-4 px-4 lg:-mx-6 lg:px-6 mb-6">
        <div className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/operations/work-queue">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Queue
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    Case #{caseData.requestId || caseData.id}
                  </h1>
                  <Badge className={getPriorityColor(caseData.priority)}>
                    {caseData.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {caseData.clientName} • {caseData.serviceId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={caseData.status}
                onValueChange={(v) => updateStatusMutation.mutate(v)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initiated">Initiated</SelectItem>
                  <SelectItem value="docs_uploaded">Docs Uploaded</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="qc_review">QC Review</SelectItem>
                  <SelectItem value="ready_for_sign">Ready for Sign</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FilingStatusCard
          filingStage={caseData.filingStage || 'not_filed'}
          filingDate={caseData.filingDate}
          filingPortal={caseData.filingPortal}
          arnNumber={caseData.arnNumber}
          queryDetails={caseData.queryDetails}
          queryRaisedAt={caseData.queryRaisedAt}
          responseSubmittedAt={caseData.responseSubmittedAt}
          finalStatus={caseData.finalStatus}
          finalStatusDate={caseData.finalStatusDate}
          onUpdate={(data) => updateFilingMutation.mutate(data)}
          isUpdating={updateFilingMutation.isPending}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">--</p>
            <p className="text-xs text-gray-500">Uploaded</p>
            <Button variant="link" size="sm" className="px-0 mt-2">
              View Documents
            </Button>
          </CardContent>
        </Card>

        <ClientInfoCard
          clientId={caseData.clientId || `C${caseData.businessEntityId}`}
          clientName={caseData.clientName || 'Unknown Client'}
          entityType={caseData.entityType}
          gstin={caseData.clientGstin}
          pan={caseData.clientPan}
          email={caseData.clientEmail}
          phone={caseData.clientPhone}
          leadId={caseData.leadReadableId}
          leadSource={caseData.leadSource}
          leadCreatedAt={caseData.leadCreatedAt}
          leadConvertedAt={caseData.leadConvertedAt}
        />

        <SlaCard
          slaDeadline={caseData.slaDeadline}
          dueDate={caseData.dueDate}
          status={caseData.status}
        />
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="notes">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="timeline">
                <Clock className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageSquare className="h-4 w-4 mr-2" />
                Internal Notes
              </TabsTrigger>
              <TabsTrigger value="actions">
                <Settings className="h-4 w-4 mr-2" />
                Actions
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="timeline" className="mt-0">
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Timeline coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <InternalNotesTab
                notes={notesData?.notes || []}
                onAddNote={(content, isClientVisible) =>
                  addNoteMutation.mutate({ content, isClientVisible })
                }
                isAdding={addNoteMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start">
                  Assign Team Member
                </Button>
                <Button variant="outline" className="justify-start">
                  Change Priority
                </Button>
                <Button variant="outline" className="justify-start">
                  Extend SLA
                </Button>
                <Button variant="outline" className="justify-start">
                  Request Documents
                </Button>
                <Button variant="outline" className="justify-start">
                  Escalate Case
                </Button>
                <Button variant="outline" className="justify-start text-red-600">
                  Put On Hold
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </DashboardLayout>
  );
}
