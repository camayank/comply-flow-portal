import { useEffect, useMemo, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { DashboardLayout } from '@/layouts';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Upload,
  Download,
  AlertCircle,
  Info,
  User,
  Calendar,
} from 'lucide-react';

const ServiceRequestDetail = () => {
  const [, params] = useRoute('/service-request/:id');
  const requestId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('unassigned');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignmentClientVisible, setAssignmentClientVisible] = useState(false);
  const [slaExtensionHours, setSlaExtensionHours] = useState('');
  const [slaExtensionReason, setSlaExtensionReason] = useState('');
  const [slaExtensionNotes, setSlaExtensionNotes] = useState('');
  const [slaExtensionClientVisible, setSlaExtensionClientVisible] = useState(false);

  const canManageAssignment =
    user?.role === 'ops_manager' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin';
  const canSelfAssign = user?.role === 'ops_executive';
  const canManageSla = canManageAssignment;

  // Fetch service request details
  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request', requestId],
    enabled: !!requestId,
    queryFn: async () => apiRequest('GET', `/api/service-requests/${requestId}`),
  });

  // Fetch request timeline/activity
  const { data: timelineResponse } = useQuery({
    queryKey: ['service-request', requestId, 'timeline'],
    enabled: !!requestId,
    queryFn: async () => apiRequest('GET', `/api/service-requests/${requestId}/timeline`),
  });
  const timeline = (timelineResponse as any)?.timeline || timelineResponse || [];

  // Fetch documents
  const { data: documentsResponse } = useQuery({
    queryKey: ['service-request', requestId, 'documents'],
    enabled: !!requestId,
    queryFn: async () => apiRequest('GET', `/api/service-requests/${requestId}/documents`),
  });
  const documents = (documentsResponse as any)?.documents || documentsResponse || [];

  // Fetch team members for assignment
  const { data: teamMembers = [], isLoading: isLoadingTeamMembers } = useQuery({
    queryKey: ['/api/escalation/team-members'],
    enabled: canManageAssignment || canSelfAssign,
  });

  const getHoursToDeadline = (deadline?: string | null) => {
    if (!deadline) return null;
    const diffMs = new Date(deadline).getTime() - Date.now();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  const pickRecommendedAssignee = (deadline?: string | null) => {
    if (!teamMembers.length) return null;
    const hoursToDeadline = getHoursToDeadline(deadline);
    const isUrgent = hoursToDeadline !== null && hoursToDeadline <= 24;
    const candidates = isUrgent
      ? teamMembers.filter((member: any) => member.available)
      : teamMembers;
    const pool = candidates.length > 0 ? candidates : teamMembers;

    let best = pool[0];
    let bestScore =
      (best.activeWorkload || 0) / (best.maxCapacity || 1) +
      (best.available ? 0 : 0.5);

    for (const member of pool) {
      const score =
        (member.activeWorkload || 0) / (member.maxCapacity || 1) +
        (member.available ? 0 : 0.5);
      if (score < bestScore) {
        best = member;
        bestScore = score;
      }
    }

    return { member: best, hoursToDeadline };
  };

  useEffect(() => {
    const currentAssignee = (request as any)?.assignedTeamMember;
    if (currentAssignee) {
      setSelectedAssignee(String(currentAssignee));
    } else {
      setSelectedAssignee('unassigned');
    }
  }, [requestId, (request as any)?.assignedTeamMember]);

  const assignedTeamMemberId = (request as any)?.assignedTeamMember as number | undefined;
  const currentAssignee = teamMembers.find((member: any) => member.id === assignedTeamMemberId);
  const currentAssigneeName =
    currentAssignee?.name || (assignedTeamMemberId ? `User #${assignedTeamMemberId}` : 'Unassigned');
  const slaDeadline = (request as any)?.slaDeadline || (request as any)?.expectedCompletionDate || null;
  const assignmentRecommendation = pickRecommendedAssignee(slaDeadline);
  const assignmentEvents = Array.isArray(timeline)
    ? [...timeline]
        .filter((event: any) => event.type === 'assignment' || event.status === 'assignment')
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  const slaExtensionPreview = useMemo(() => {
    const extensionHours = Number(slaExtensionHours);
    if (!Number.isFinite(extensionHours) || extensionHours <= 0) return null;
    const currentDeadline = slaDeadline ? new Date(slaDeadline) : null;
    const baseDeadline = currentDeadline ?? new Date();
    const newDeadline = new Date(baseDeadline.getTime() + extensionHours * 60 * 60 * 1000);
    return {
      currentDeadline,
      newDeadline,
      hasExistingDeadline: !!currentDeadline,
    };
  }, [slaDeadline, slaExtensionHours]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      return apiRequest('POST', `/api/client/service-requests/${requestId}/comments`, {
        content: comment,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Comment Added',
        description: 'Your comment has been posted successfully.',
      });
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId, 'timeline'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assigneeId: number | null) => {
      return apiRequest('PATCH', `/api/service-requests/${requestId}`, {
        assignedTeamMember: assigneeId,
        assignmentNotes,
        clientVisible: assignmentClientVisible,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Assignment updated',
        description: 'Service request assignment has been updated.',
      });
      setAssignmentNotes('');
      setAssignmentClientVisible(false);
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue', 'stats'] });
    },
    onError: () => {
      toast({
        title: 'Assignment failed',
        description: 'Unable to update assignment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const slaExtensionMutation = useMutation({
    mutationFn: async () => {
      if (!requestId) throw new Error('Service request not found');
      const extensionHours = Number(slaExtensionHours);
      if (!Number.isFinite(extensionHours) || extensionHours <= 0) {
        throw new Error('Enter a valid extension in hours');
      }
      if (!slaExtensionReason.trim()) {
        throw new Error('Reason is required for SLA extension');
      }
      const parsedId = Number(requestId);
      if (!Number.isFinite(parsedId)) {
        throw new Error('Invalid service request id');
      }

      return apiRequest('POST', '/api/sla/exception/bulk', {
        serviceRequestIds: [parsedId],
        extensionHours,
        reason: slaExtensionReason.trim(),
        notes: slaExtensionNotes || undefined,
        clientVisible: slaExtensionClientVisible,
      });
    },
    onSuccess: () => {
      toast({
        title: 'SLA extended',
        description: 'SLA deadline has been updated.',
      });
      setSlaExtensionHours('');
      setSlaExtensionReason('');
      setSlaExtensionNotes('');
      setSlaExtensionClientVisible(false);
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue', 'stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'SLA extension failed',
        description: error.message || 'Unable to extend SLA',
        variant: 'destructive',
      });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  const handleAssignmentSave = () => {
    const assigneeId =
      selectedAssignee === 'unassigned' ? null : parseInt(selectedAssignee, 10);
    assignMutation.mutate(assigneeId);
  };

  const handleSelfAssign = () => {
    if (!user?.id) return;
    assignMutation.mutate(user.id);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'initiated':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'pending_review':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-green-500';
      case 'on_hold':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'initiated':
        return 'Initiated';
      case 'in_progress':
        return 'In Progress';
      case 'pending_review':
        return 'Pending Review';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'normal':
        return 'bg-blue-500 text-white';
      case 'low':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const calculateProgress = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'initiated':
        return 25;
      case 'in_progress':
        return 50;
      case 'pending_review':
        return 75;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading service request...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Request Not Found</h3>
            <p className="text-sm text-gray-600 mb-4">The service request you're looking for doesn't exist.</p>
            <Link href="/client-portal">
              <Button>Back to Portal</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = calculateProgress((request as any).status);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/client-portal">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Service Request #{(request as any).id}</h1>
                <p className="text-sm text-gray-600">Track your service request progress</p>
              </div>
            </div>
            <Badge className={`${getStatusColor((request as any).status)} text-white`}>
              {getStatusText((request as any).status)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Progress Bar */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Service Progress</CardTitle>
                <CardDescription>Current status: {getStatusText((request as any).status)}</CardDescription>
              </div>
              <Badge className={getPriorityColor((request as any).priority)}>
                {(request as any).priority} Priority
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600 mt-4">
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${progress >= 25 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <span>Initiated</span>
                </div>
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${progress >= 50 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <span>In Progress</span>
                </div>
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${progress >= 75 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <span>Review</span>
                </div>
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${progress >= 100 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium">{(request as any).serviceId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium">₹{(request as any).totalAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{new Date((request as any).createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected Completion</p>
                    <p className="font-medium">{(request as any).expectedCompletionDate || 'TBD'}</p>
                  </div>
                </div>
                {(request as any).notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Notes</p>
                    <p className="text-sm">{(request as any).notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs for Timeline, Documents, Communication */}
            <Card>
              <Tabs defaultValue="timeline" className="w-full">
                <CardHeader className="pb-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="timeline" data-testid="tab-timeline">
                      <Clock className="h-4 w-4 mr-2" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="documents" data-testid="tab-documents">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="communication" data-testid="tab-communication">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Messages
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="mt-0">
                    <div className="space-y-4">
                      {timeline.length > 0 ? (
                        timeline.map((event: any, index: number) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-sm text-gray-600">{event.description}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No timeline events yet</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="mt-0">
                    <div className="space-y-3">
                      {documents.length > 0 ? (
                        documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-600" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-gray-600">{doc.size} • {doc.uploadedAt}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-4">No documents uploaded yet</p>
                          <Button size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Documents
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Communication Tab */}
                  <TabsContent value="communication" className="mt-0">
                    <div className="space-y-4">
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {/* Sample messages - replace with real data */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm">Your request has been received and assigned to our team.</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                          </div>
                        </div>
                      </div>

                      {/* Add Comment Form */}
                      <div className="border-t pt-4">
                        <Textarea
                          placeholder="Type your message here..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="mb-2"
                          rows={3}
                          data-testid="textarea-comment"
                        />
                        <Button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || addCommentMutation.isPending}
                          size="sm"
                          data-testid="button-send-message"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {addCommentMutation.isPending ? 'Sending...' : 'Send Message'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" data-testid="button-upload-docs">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
                <Button className="w-full justify-start" variant="outline" data-testid="button-download-invoice">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
                <Button className="w-full justify-start" variant="outline" data-testid="button-contact-support">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{currentAssigneeName}</p>
                    <p className="text-xs text-gray-600">
                      {assignedTeamMemberId ? 'Assigned' : 'Unassigned'}
                    </p>
                  </div>
                </div>

                {canManageAssignment && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Assign to</Label>
                      <Select
                        value={selectedAssignee}
                        onValueChange={setSelectedAssignee}
                        disabled={isLoadingTeamMembers || assignMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map((member: any) => (
                            <SelectItem key={member.id} value={String(member.id)}>
                              {member.name} • {member.role.replace(/_/g, ' ')} • {member.activeWorkload}/{member.maxCapacity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isLoadingTeamMembers && teamMembers.length === 0 && (
                        <p className="text-xs text-gray-500">No team members available for assignment.</p>
                      )}
                      {assignmentRecommendation?.member && (
                        <p className="text-xs text-amber-700">
                          Recommended: {assignmentRecommendation.member.name}
                          {assignmentRecommendation.hoursToDeadline !== null && (
                            <span className="ml-1 text-amber-600">
                              (SLA {assignmentRecommendation.hoursToDeadline <= 0 ? 'overdue' : `in ${assignmentRecommendation.hoursToDeadline}h`})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        rows={3}
                        placeholder="Add assignment context"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="assignment-client-visible"
                        checked={assignmentClientVisible}
                        onCheckedChange={(checked) => setAssignmentClientVisible(checked === true)}
                      />
                      <Label htmlFor="assignment-client-visible" className="text-sm">
                        Show assignment update on client timeline
                      </Label>
                    </div>
                    <Button
                      onClick={handleAssignmentSave}
                      disabled={assignMutation.isPending || isLoadingTeamMembers}
                    >
                      {assignMutation.isPending ? 'Saving...' : 'Save Assignment'}
                    </Button>
                  </div>
                )}

                {!canManageAssignment && canSelfAssign && !assignedTeamMemberId && (
                  <Button
                    onClick={handleSelfAssign}
                    disabled={assignMutation.isPending}
                  >
                    {assignMutation.isPending ? 'Assigning...' : 'Assign to me'}
                  </Button>
                )}
                {!canManageAssignment && canSelfAssign && assignedTeamMemberId === user?.id && (
                  <Badge variant="outline" className="text-green-600">
                    Assigned to you
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Assignment History */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignmentEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignment updates yet.</p>
                ) : (
                  assignmentEvents.map((event: any) => (
                    <div key={event.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                      <p className="text-sm font-medium">{event.title || 'Assignment Update'}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {canManageSla && (
              <Card>
                <CardHeader>
                  <CardTitle>SLA Extension</CardTitle>
                  <CardDescription>Extend the SLA deadline with audit trail.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    Current SLA: {slaDeadline ? new Date(slaDeadline).toLocaleString() : 'Not set'}
                  </div>
                  <div className="space-y-2">
                    <Label>Extension (hours)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={slaExtensionHours}
                      onChange={(e) => setSlaExtensionHours(e.target.value)}
                      placeholder="e.g., 24"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={slaExtensionReason}
                      onChange={(e) => setSlaExtensionReason(e.target.value)}
                      placeholder="Reason for SLA extension"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={slaExtensionNotes}
                      onChange={(e) => setSlaExtensionNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional context for audit logs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sla-client-visible"
                      checked={slaExtensionClientVisible}
                      onCheckedChange={(checked) => setSlaExtensionClientVisible(checked === true)}
                    />
                    <Label htmlFor="sla-client-visible" className="text-sm">
                      Show SLA update on client timeline
                    </Label>
                  </div>
                  {slaExtensionPreview && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      <div className="font-medium text-slate-900">Preview</div>
                      <div className="mt-1">
                        {slaExtensionPreview.hasExistingDeadline
                          ? slaExtensionPreview.currentDeadline?.toLocaleString()
                          : 'No SLA'}
                        {' → '}
                        {slaExtensionPreview.newDeadline.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => slaExtensionMutation.mutate()}
                    disabled={
                      slaExtensionMutation.isPending ||
                      !slaExtensionHours ||
                      !slaExtensionReason.trim()
                    }
                  >
                    {slaExtensionMutation.isPending ? 'Applying...' : 'Extend SLA'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Important Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Important Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Request Created</p>
                    <p className="text-xs text-gray-600">{new Date((request as any).createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {(request as any).expectedCompletionDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Expected Completion</p>
                      <p className="text-xs text-gray-600">{(request as any).expectedCompletionDate}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Need Help?</p>
                    <p className="text-xs text-blue-700">
                      Contact our support team if you have any questions about your request.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ServiceRequestDetail;
