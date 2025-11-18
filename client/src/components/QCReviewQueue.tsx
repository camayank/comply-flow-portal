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
import { getStatusColor } from '@/lib/design-system-utils';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton-loader';
import { EmptySuccess } from '@/components/ui/empty-state';

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

    if (hoursUntilDue < 0) return { status: 'overdue', color: 'text-error', label: 'Overdue' };
    if (hoursUntilDue < 4) return { status: 'critical', color: 'text-error', label: 'Critical' };
    if (hoursUntilDue < 24) return { status: 'warning', color: 'text-warning', label: 'Due Soon' };
    return { status: 'normal', color: 'text-success', label: 'On Track' };
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = (now.getTime() - past.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    const days = Math.floor(diffInHours / 24);
    return `${days}d ago`;
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <SkeletonList items={5} />
          </CardContent>
        </Card>
      </div>
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
                <p className="text-sm text-muted-foreground">Total Queue</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
              </div>
              <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-warning">{stats.highPriority}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-error">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Wait</p>
                <p className="text-2xl font-bold text-foreground">{stats.avgWaitTime}h</p>
              </div>
              <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Utilization</p>
                <p className="text-2xl font-bold text-success">{stats.qcTeamUtilization}%</p>
              </div>
              <User className="h-6 w-6 text-success" aria-hidden="true" />
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
              <EmptySuccess
                title="Queue is empty"
                description="No items in the QC review queue matching your filters"
              />
            ) : (
              sortedItems.map((item) => {
                const slaStatus = getSLAStatus(item.slaDeadline);
                return (
                  <Card
                    key={item.id}
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      slaStatus.status === 'overdue' ? 'border-error/30 bg-error/5' :
                      slaStatus.status === 'critical' ? 'border-warning/30 bg-warning/5' : ''
                    }`}
                    onClick={() => onItemSelect?.(item)}
                    data-testid={`queue-item-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-foreground">{item.clientName}</h4>
                            <Badge className={getStatusColor(item.priority)}>
                              {item.priority}
                            </Badge>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                            <span className={`text-sm font-medium ${slaStatus.color}`}>
                              {slaStatus.label}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{item.serviceName}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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