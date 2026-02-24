import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  CheckCircle,
  PlayCircle,
  ClipboardCheck,
  XCircle,
  Timer,
  ListTodo,
} from 'lucide-react';
import {
  FilingStatusCard,
  ClientInfoCard,
  SlaCard,
  InternalNotesTab,
} from '@/components/ops';
import { useOrderTasks, OrderTask } from '@/features/operations/hooks';
import { format } from 'date-fns';

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
              <TaskTimeline orderId={Number(caseId)} />
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

// Task Timeline Component
function TaskTimeline({ orderId }: { orderId: number }) {
  const orderTasksQuery = useOrderTasks(orderId);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
      completed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
      in_progress: { icon: PlayCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      ready: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      qc_pending: { icon: ClipboardCheck, color: 'text-purple-600', bgColor: 'bg-purple-100' },
      qc_rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
      blocked: { icon: Timer, color: 'text-gray-400', bgColor: 'bg-gray-100' },
      skipped: { icon: XCircle, color: 'text-gray-400', bgColor: 'bg-gray-100' },
      cancelled: { icon: XCircle, color: 'text-gray-400', bgColor: 'bg-gray-100' },
    };
    return configs[status] || configs.blocked;
  };

  if (orderTasksQuery.isLoading) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2" />
        <p className="text-sm">Loading task timeline...</p>
      </div>
    );
  }

  if (orderTasksQuery.error || !orderTasksQuery.data?.tasks?.length) {
    return (
      <div className="py-8 text-center text-gray-500">
        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No tasks found for this order</p>
        <p className="text-xs mt-1">Tasks will appear here once they are created</p>
      </div>
    );
  }

  const { tasks, summary } = orderTasksQuery.data;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-bold">{summary.progressPercentage}%</span>
        </div>
        <Progress value={summary.progressPercentage} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{summary.completed} of {summary.total} tasks completed</span>
          <span>
            {summary.inProgress > 0 && `${summary.inProgress} in progress`}
            {summary.inProgress > 0 && summary.pending > 0 && ' • '}
            {summary.pending > 0 && `${summary.pending} pending`}
          </span>
        </div>
      </div>

      {/* Task Timeline */}
      <div className="relative">
        {tasks.map((task, index) => {
          const config = getStatusConfig(task.status);
          const Icon = config.icon;
          const isLast = index === tasks.length - 1;

          return (
            <div key={task.id} className="relative pb-8 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <span
                  className={`absolute left-5 top-10 -ml-px h-full w-0.5 ${
                    task.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex items-start space-x-4">
                {/* Status Icon */}
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Step {task.stepNumber}: {task.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {task.assignedRole?.replace(/_/g, ' ')}
                        {task.assignedToName && ` • ${task.assignedToName}`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${config.bgColor} ${config.color} border-0 text-xs`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Timestamps */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {task.startedAt && (
                      <span>Started: {format(new Date(task.startedAt), 'MMM d, h:mm a')}</span>
                    )}
                    {task.completedAt && (
                      <span className="text-green-600">
                        Completed: {format(new Date(task.completedAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                    {task.dueDate && !task.completedAt && (
                      <span className={new Date(task.dueDate) < new Date() ? 'text-red-600' : ''}>
                        Due: {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>

                  {/* QC Rejection Notes */}
                  {task.status === 'qc_rejected' && task.qcRejectionNotes && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <strong>QC Rejected:</strong> {task.qcRejectionNotes}
                    </div>
                  )}

                  {/* View Task Link */}
                  <div className="mt-2">
                    <Link href={`/ops/tasks/${task.taskId || task.id}`}>
                      <Button variant="link" size="sm" className="px-0 h-auto text-xs">
                        View Task Details →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
