import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Calendar,
  Star,
  ArrowUpDown,
  Filter,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { type QualityReview } from '@shared/schema';

interface QCQueueItem {
  id: number;
  serviceRequestId: number;
  clientName: string;
  serviceName: string;
  serviceType: string;
  priority: string;
  status: string;
  assignedAt: string;
  assignedTo?: number;
  assignedToName?: string;
  slaDeadline: string;
  estimatedTime: number;
  qualityScore?: number;
  reviewerId?: number;
  reviewerName?: string;
}

interface QueueStats {
  totalItems: number;
  highPriority: number;
  overdue: number;
  avgWaitTime: number;
  qcTeamUtilization: number;
}

interface QCReviewQueueProps {
  onItemSelect?: (item: QCQueueItem) => void;
  showAssignmentControls?: boolean;
}

const PRIORITY_ORDER = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rework_required: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  escalated: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

export default function QCReviewQueue({ onItemSelect, showAssignmentControls = true }: QCReviewQueueProps) {
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Fetch QC queue data
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['qc-queue', { sort: sortBy, order: sortOrder, status: filterStatus, priority: filterPriority, assignee: filterAssignee, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort: sortBy,
        order: sortOrder,
        ...(filterStatus && { status: filterStatus }),
        ...(filterPriority && { priority: filterPriority }),
        ...(filterAssignee && { assignee: filterAssignee }),
        ...(searchTerm && { search: searchTerm })
      });
      const response = await fetch(`/api/qc/queue?${params.toString()}`);
      return response.json();
    }
  });

  // Fetch QC team members for assignment
  const { data: qcTeam } = useQuery({
    queryKey: ['qc-team'],
    queryFn: async () => {
      const response = await fetch('/api/qc/team');
      return response.json();
    }
  });

  // Assign review mutation
  const assignReviewMutation = useMutation({
    mutationFn: async ({ reviewId, reviewerId }: { reviewId: number; reviewerId: number }) => {
      return apiRequest(`/api/qc/reviews/${reviewId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-queue'] });
    }
  });

  // Auto-assign reviews mutation
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/qc/reviews/auto-assign', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-queue'] });
    }
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleAssignReview = (reviewId: number, reviewerId: number) => {
    assignReviewMutation.mutate({ reviewId, reviewerId });
  };

  const getSLAStatus = (deadline: string) => {
    const now = new Date();
    const due = new Date(deadline);
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) return { status: 'overdue', color: 'text-red-600', label: 'Overdue' };
    if (hoursUntilDue < 4) return { status: 'critical', color: 'text-red-500', label: 'Critical' };
    if (hoursUntilDue < 24) return { status: 'warning', color: 'text-orange-500', label: 'Due Soon' };
    return { status: 'normal', color: 'text-green-500', label: 'On Track' };
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const queueItems: QCQueueItem[] = queueData?.items || [];
  const stats: QueueStats = queueData?.stats || {
    totalItems: 0,
    highPriority: 0,
    overdue: 0,
    avgWaitTime: 0,
    qcTeamUtilization: 0
  };

  // Sort items based on priority and other factors
  const sortedItems = [...queueItems].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityA = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] || 0;
      const priorityB = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] || 0;
      return sortOrder === 'desc' ? priorityB - priorityA : priorityA - priorityB;
    }
    if (sortBy === 'deadline') {
      const dateA = new Date(a.slaDeadline).getTime();
      const dateB = new Date(b.slaDeadline).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }
    if (sortBy === 'assigned') {
      const timeA = new Date(a.assignedAt).getTime();
      const timeB = new Date(b.assignedAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
    return 0;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Queue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalItems}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{stats.highPriority}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Avg Wait</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgWaitTime}h</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Team Utilization</p>
                <p className="text-2xl font-bold text-green-600">{stats.qcTeamUtilization}%</p>
              </div>
              <User className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>QC Review Queue</CardTitle>
            <div className="flex gap-2">
              {showAssignmentControls && (
                <Button
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={autoAssignMutation.isPending}
                  variant="outline"
                  data-testid="button-auto-assign"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Auto Assign
                </Button>
              )}
              <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-queue">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="Search by client or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-queue"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32" data-testid="select-priority-filter">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {showAssignmentControls && (
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-40" data-testid="select-assignee-filter">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {qcTeam?.map((member: any) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setFilterPriority('');
                setFilterAssignee('');
              }}
              data-testid="button-clear-queue-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'priority' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('priority')}
              data-testid="button-sort-priority"
            >
              Priority
              {sortBy === 'priority' && (
                <ArrowUpDown className="h-4 w-4 ml-1" />
              )}
            </Button>
            <Button
              variant={sortBy === 'deadline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('deadline')}
              data-testid="button-sort-deadline"
            >
              Deadline
              {sortBy === 'deadline' && (
                <ArrowUpDown className="h-4 w-4 ml-1" />
              )}
            </Button>
            <Button
              variant={sortBy === 'assigned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('assigned')}
              data-testid="button-sort-assigned"
            >
              Assigned Time
              {sortBy === 'assigned' && (
                <ArrowUpDown className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>

          {/* Queue Items */}
          <div className="space-y-3">
            {sortedItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Queue is empty
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  No items in the QC review queue matching your filters
                </p>
              </div>
            ) : (
              sortedItems.map((item) => {
                const slaStatus = getSLAStatus(item.slaDeadline);
                return (
                  <Card 
                    key={item.id} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      slaStatus.status === 'overdue' ? 'border-red-300 bg-red-50 dark:bg-red-950' :
                      slaStatus.status === 'critical' ? 'border-orange-300 bg-orange-50 dark:bg-orange-950' : ''
                    }`}
                    onClick={() => onItemSelect?.(item)}
                    data-testid={`queue-item-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{item.clientName}</h4>
                            <Badge className={PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}>
                              {item.priority}
                            </Badge>
                            <Badge className={STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]}>
                              {item.status}
                            </Badge>
                            <span className={`text-sm font-medium ${slaStatus.color}`}>
                              {slaStatus.label}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300">{item.serviceName}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Assigned {formatTimeAgo(item.assignedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Due {new Date(item.slaDeadline).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {item.reviewerName || 'Unassigned'}
                            </span>
                            {item.qualityScore && (
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                Score: {item.qualityScore}%
                              </span>
                            )}
                          </div>
                        </div>
                        {showAssignmentControls && !item.reviewerId && (
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(value) => handleAssignReview(item.id, parseInt(value))}>
                              <SelectTrigger className="w-40" data-testid={`select-assign-${item.id}`}>
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {qcTeam?.map((member: any) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {member.name} ({member.activeReviews || 0} active)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}