import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar,
  Star,
  Filter,
  Search,
  ArrowUpDown,
  Eye,
  Edit,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { type QualityReview, type ServiceRequest } from '@shared/schema';

interface QCDashboardData {
  pendingReviews: QualityReview[];
  myReviews: QualityReview[];
  completed: QualityReview[];
  stats: {
    totalPending: number;
    myAssigned: number;
    completedToday: number;
    avgReviewTime: number;
    qualityScore: number;
    slaCompliance: number;
  };
}

interface QualityChecklistItem {
  id: string;
  category: string;
  item: string;
  status: 'pending' | 'passed' | 'failed';
  notes?: string;
  isMandatory: boolean;
  weight: number;
}

interface ServiceWithReview extends ServiceRequest {
  qualityReview?: QualityReview;
  clientName: string;
  serviceName: string;
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rework_required: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  escalated: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  if (Number.isNaN(past.getTime())) {
    return 'Unknown';
  }
  const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
};

export default function QCDashboard() {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('assignedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReview, setSelectedReview] = useState<ServiceWithReview | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [checklist, setChecklist] = useState<QualityChecklistItem[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [internalComments, setInternalComments] = useState('');
  const [qualityScore, setQualityScore] = useState(0);

  const queryClient = useQueryClient();

  // Fetch QC dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery<QCDashboardData>({
    queryKey: ['qc-dashboard', { search: searchTerm, priority: priorityFilter, status: statusFilter, sort: sortBy, order: sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        tab: selectedTab,
        search: searchTerm,
        priority: priorityFilter,
        status: statusFilter,
        sort: sortBy,
        order: sortOrder
      });
      const response = await fetch(`/api/qc/dashboard?${params.toString()}`);
      return response.json();
    }
  });

  // Fetch quality checklist for a service
  const fetchChecklist = async (serviceType: string) => {
    const response = await fetch(`/api/qc/checklist/${serviceType}`);
    const data = await response.json();
    setChecklist(data.checklistItems || []);
  };

  // Start QC review mutation
  const startReviewMutation = useMutation({
    mutationFn: async ({ reviewId, serviceType }: { reviewId: number; serviceType: string }) => {
      await fetchChecklist(serviceType);
      return apiRequest('POST', `/api/qc/reviews/${reviewId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-dashboard'] });
    }
  });

  // Submit QC review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: {
      reviewId: number;
      status: string;
      qualityScore: number;
      checklist: QualityChecklistItem[];
      reviewNotes: string;
      internalComments: string;
      clientFacingNotes?: string;
      reworkInstructions?: string;
    }) => {
      return apiRequest('POST', `/api/qc/reviews/${data.reviewId}/submit`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-dashboard'] });
      setIsReviewDialogOpen(false);
      setSelectedReview(null);
      setChecklist([]);
      setReviewNotes('');
      setInternalComments('');
      setQualityScore(0);
    }
  });

  // Calculate quality score based on checklist
  useEffect(() => {
    const totalWeight = checklist.reduce((sum, item) => sum + item.weight, 0);
    const passedWeight = checklist
      .filter(item => item.status === 'passed')
      .reduce((sum, item) => sum + item.weight, 0);
    
    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
    setQualityScore(score);
  }, [checklist]);

  const handleChecklistItemChange = (itemId: string, status: 'passed' | 'failed', notes?: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status, notes }
        : item
    ));
  };

  const handleStartReview = (review: ServiceWithReview) => {
    setSelectedReview(review);
    startReviewMutation.mutate({ 
      reviewId: review.qualityReview?.id || 0, 
      serviceType: review.serviceId 
    });
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = (status: 'approved' | 'rejected' | 'rework_required') => {
    if (!selectedReview?.qualityReview) return;

    const mandatoryFailed = checklist
      .filter(item => item.isMandatory && item.status === 'failed');

    if (status === 'approved' && mandatoryFailed.length > 0) {
      alert('Cannot approve: Mandatory checklist items have failed');
      return;
    }

    submitReviewMutation.mutate({
      reviewId: selectedReview.qualityReview.id,
      status,
      qualityScore,
      checklist,
      reviewNotes,
      internalComments,
      ...(status === 'rework_required' && { reworkInstructions: reviewNotes })
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected': return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'rework_required': return <RefreshCw className="h-4 w-4 text-orange-600" />;
      case 'escalated': return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 p-6">
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
    <DashboardLayout>
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quality Control Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Review and approve service deliverables
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            data-testid="button-refresh"
          >
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
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats.totalPending || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">My Assigned</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats.myAssigned || 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Completed Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats.completedToday || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg Review Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats.avgReviewTime || 0}m
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Quality Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats.qualityScore || 0}%
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">SLA Compliance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats.slaCompliance || 0}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
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
                    placeholder="Search by client name, service type..."
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="rework_required">Rework Required</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setPriorityFilter('all');
                  setStatusFilter('all');
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QC Review Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Reviews ({dashboardData?.pendingReviews.length || 0})
            </TabsTrigger>
            <TabsTrigger value="assigned" data-testid="tab-assigned">
              My Reviews ({dashboardData?.myReviews.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({dashboardData?.completed.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <QCReviewList 
              reviews={dashboardData?.pendingReviews || []} 
              onStartReview={handleStartReview}
              type="pending"
            />
          </TabsContent>

          <TabsContent value="assigned" className="space-y-4">
            <QCReviewList 
              reviews={dashboardData?.myReviews || []} 
              onStartReview={handleStartReview}
              type="assigned"
            />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <QCReviewList 
              reviews={dashboardData?.completed || []} 
              onStartReview={handleStartReview}
              type="completed"
            />
          </TabsContent>
        </Tabs>

        {/* QC Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quality Review: {selectedReview?.serviceName}
              </DialogTitle>
              <DialogDescription>
                Review and assess the quality of deliverables for {selectedReview?.clientName}
              </DialogDescription>
            </DialogHeader>

            {selectedReview && (
              <div className="space-y-6">
                {/* Service Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Service Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Client</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectedReview.clientName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Service</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectedReview.serviceName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Priority</Label>
                        <Badge className={PRIORITY_COLORS[selectedReview.priority as keyof typeof PRIORITY_COLORS]}>
                          {selectedReview.priority}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">SLA Deadline</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {selectedReview.qualityReview?.slaDeadline 
                            ? new Date(selectedReview.qualityReview.slaDeadline).toLocaleDateString()
                            : 'Not set'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quality Checklist */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Quality Checklist
                      <div className="text-sm font-normal">
                        Score: <span className="font-bold text-lg">{qualityScore}%</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {checklist.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{item.item}</h4>
                                {item.isMandatory && (
                                  <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Weight: {item.weight}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.category}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={item.status === 'passed' ? 'default' : 'outline'}
                                onClick={() => handleChecklistItemChange(item.id, 'passed')}
                                className={item.status === 'passed' ? 'bg-green-600 hover:bg-green-700' : ''}
                                data-testid={`button-pass-${item.id}`}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={item.status === 'failed' ? 'destructive' : 'outline'}
                                onClick={() => handleChecklistItemChange(item.id, 'failed')}
                                data-testid={`button-fail-${item.id}`}
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {item.status === 'failed' && (
                            <Textarea
                              placeholder="Add notes for failed item..."
                              value={item.notes || ''}
                              onChange={(e) => handleChecklistItemChange(item.id, 'failed', e.target.value)}
                              className="mt-2"
                              data-testid={`textarea-notes-${item.id}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Review Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="review-notes">Client-Facing Notes</Label>
                      <Textarea
                        id="review-notes"
                        placeholder="Add notes that will be shared with the client..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        data-testid="textarea-review-notes"
                      />
                    </div>
                    <div>
                      <Label htmlFor="internal-comments">Internal Comments</Label>
                      <Textarea
                        id="internal-comments"
                        placeholder="Add internal comments for team reference..."
                        value={internalComments}
                        onChange={(e) => setInternalComments(e.target.value)}
                        data-testid="textarea-internal-comments"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsReviewDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleSubmitReview('rejected')}
                    disabled={submitReviewMutation.isPending}
                    data-testid="button-reject"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmitReview('rework_required')}
                    disabled={submitReviewMutation.isPending}
                    className="border-orange-500 text-orange-700 hover:bg-orange-50"
                    data-testid="button-rework"
                  >
                    Request Rework
                  </Button>
                  <Button
                    onClick={() => handleSubmitReview('approved')}
                    disabled={submitReviewMutation.isPending || qualityScore < 80}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-approve"
                  >
                    {submitReviewMutation.isPending ? 'Submitting...' : 'Approve'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </DashboardLayout>
  );
}

// QC Review List Component
interface QCReviewListProps {
  reviews: any[];
  onStartReview: (review: any) => void;
  type: 'pending' | 'assigned' | 'completed';
}

function QCReviewList({ reviews, onStartReview, type }: QCReviewListProps) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No reviews found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {type === 'pending' && 'No pending reviews available for assignment'}
            {type === 'assigned' && 'You have no assigned reviews'}
            {type === 'completed' && 'No completed reviews in the current filter'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{review.clientName}</h3>
                  <Badge className={PRIORITY_COLORS[review.priority as keyof typeof PRIORITY_COLORS]}>
                    {review.priority}
                  </Badge>
                  <Badge className={STATUS_COLORS[review.qualityReview?.status as keyof typeof STATUS_COLORS]}>
                    {review.qualityReview?.status || 'pending'}
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{review.serviceName}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Assigned {review.qualityReview?.assignedAt ? formatTimeAgo(review.qualityReview.assignedAt) : 'Just now'}
                  </span>
                  {review.qualityReview?.slaDeadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Due {new Date(review.qualityReview.slaDeadline).toLocaleDateString()}
                    </span>
                  )}
                  {review.qualityReview?.qualityScore && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Score: {review.qualityReview.qualityScore}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {type !== 'completed' && (
                  <Button
                    onClick={() => onStartReview(review)}
                    size="sm"
                    data-testid={`button-start-review-${review.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {review.qualityReview?.status === 'in_progress' ? 'Continue Review' : 'Start Review'}
                  </Button>
                )}
                <Button variant="outline" size="sm" data-testid={`button-view-details-${review.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}