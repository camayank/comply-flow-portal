import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
  const [newComment, setNewComment] = useState('');

  // Fetch service request details
  const { data: request, isLoading } = useQuery({
    queryKey: ['/api/service-requests', requestId],
    enabled: !!requestId,
  });

  // Fetch request timeline/activity
  const { data: timeline = [] } = useQuery({
    queryKey: ['/api/service-requests', requestId, 'timeline'],
    enabled: !!requestId,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/service-requests', requestId, 'documents'],
    enabled: !!requestId,
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests', requestId, 'timeline'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Request Not Found</h3>
          <p className="text-sm text-gray-600 mb-4">The service request you're looking for doesn't exist.</p>
          <Link href="/client-portal">
            <Button>Back to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = calculateProgress((request as any).status);

  return (
    <div className="min-h-screen bg-gray-50">
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

            {/* Assigned Team */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Operations Team</p>
                    <p className="text-xs text-gray-600">Assigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
    </div>
  );
};

export default ServiceRequestDetail;
