import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useOpsTeamMembers } from '@/hooks/useOperations';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Users,
  FileText,
  UserPlus,
  Search,
  Filter,
} from 'lucide-react';

interface ServiceOrder {
  id: number;
  requestId?: string | null;
  displayId?: string;
  serviceId: string;
  businessEntityId?: number | null;
  entityName?: string | null;
  entityType?: string | null;
  status: string;
  priority: string;
  progress?: number | null;
  slaDeadline?: string | null;
  totalAmount?: number | null;
  createdAt?: string;
  updatedAt?: string;
  assignedTeamMember?: number | null;
  assignedToName?: string | null;
  assignedToRole?: string | null;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'documents_pending', label: 'Documents Pending' },
  { value: 'documents_uploaded', label: 'Documents Uploaded' },
  { value: 'documents_verified', label: 'Documents Verified' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'processing', label: 'Processing' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'qc_review', label: 'QC Review' },
  { value: 'qc_approved', label: 'QC Approved' },
  { value: 'qc_rejected', label: 'QC Rejected' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'awaiting_client_confirmation', label: 'Awaiting Client Confirmation' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'sla_breached', label: 'SLA Breached' },
];

const STATUS_LABELS = STATUS_OPTIONS.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

function getHoursToDeadline(deadline?: string | null) {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60));
}

function pickRecommendedAssignee(
  teamMembers: Array<{ id: number; name: string; activeWorkload: number; maxCapacity: number; available: boolean }>,
  deadline?: string | null
) {
  if (!teamMembers.length) return null;
  const hoursToDeadline = getHoursToDeadline(deadline);
  const isUrgent = hoursToDeadline !== null && hoursToDeadline <= 24;

  const candidates = isUrgent
    ? teamMembers.filter((member) => member.available)
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

  return {
    member: best,
    hoursToDeadline,
  };
}

export default function OperationsServiceRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManageAssignment =
    user?.role === 'ops_manager' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin';
  const canSelfAssign = user?.role === 'ops_executive';
  const canBulkStatus =
    user?.role === 'ops_manager' ||
    user?.role === 'ops_executive' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin';
  const canManagePriority = canManageAssignment;

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    search: '',
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('unassigned');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkClientVisible, setBulkClientVisible] = useState(false);
  const [bulkAssigneeTouched, setBulkAssigneeTouched] = useState(false);
  const [autoSelectRecommended, setAutoSelectRecommended] = useState(true);
  const [showAssignmentPreview, setShowAssignmentPreview] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkStatusReason, setBulkStatusReason] = useState('');
  const [bulkStatusNotes, setBulkStatusNotes] = useState('');
  const [bulkForceStatus, setBulkForceStatus] = useState(false);
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkPriorityNotes, setBulkPriorityNotes] = useState('');
  const [bulkSlaHours, setBulkSlaHours] = useState('');
  const [bulkSlaReason, setBulkSlaReason] = useState('');
  const [bulkSlaNotes, setBulkSlaNotes] = useState('');
  const [bulkSlaClientVisible, setBulkSlaClientVisible] = useState(false);

  const { data: teamMembers = [], isLoading: isLoadingTeamMembers } = useOpsTeamMembers(canManageAssignment || canSelfAssign);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ops', 'service-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/ops/service-orders?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch service requests');
      }
      return response.json();
    },
  });

  const orders: ServiceOrder[] = data?.data || [];

  const { data: statusPreview } = useQuery({
    queryKey: ['ops', 'service-orders', 'transition-preview', selectedIds, bulkStatus],
    enabled: canBulkStatus && selectedIds.length > 0 && !!bulkStatus,
    queryFn: async () => {
      return apiRequest('POST', '/api/service-requests/transition-preview', {
        serviceRequestIds: selectedIds,
        toStatus: bulkStatus,
      });
    },
  });

  const previewBlocked = statusPreview?.blocked || [];
  const previewAllowed = statusPreview?.allowed || [];
  const previewMissing = statusPreview?.missing || [];
  const previewHasFailures = previewBlocked.length > 0 || previewMissing.length > 0;

  const assigneeMap = useMemo(() => {
    const map = new Map<number, string>();
    teamMembers.forEach((member) => {
      map.set(member.id, member.name);
    });
    return map;
  }, [teamMembers]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(orders.map((order) => order.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (orderId: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, orderId] : prev.filter((id) => id !== orderId)
    );
  };

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds]
  );

  const mostUrgentOrder = useMemo(() => {
    if (selectedOrders.length === 0) return null;
    return [...selectedOrders].sort((a, b) => {
      if (!a.slaDeadline) return 1;
      if (!b.slaDeadline) return -1;
      return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
    })[0];
  }, [selectedOrders]);

  const bulkRecommendation = useMemo(() => {
    if (!mostUrgentOrder) return null;
    return pickRecommendedAssignee(teamMembers, mostUrgentOrder.slaDeadline);
  }, [teamMembers, mostUrgentOrder]);

  const assignmentPreview = useMemo(() => {
    if (!showAssignmentPreview) return [];
    return selectedOrders.map((order) => {
      const recommendation = pickRecommendedAssignee(teamMembers, order.slaDeadline);
      return {
        id: order.id,
        displayId: order.displayId || `SR-${order.id}`,
        recommended: recommendation?.member?.name || 'No match',
        hoursToDeadline: recommendation?.hoursToDeadline ?? null,
      };
    });
  }, [selectedOrders, showAssignmentPreview, teamMembers]);

  const slaExtensionPreview = useMemo(() => {
    const extensionHours = Number(bulkSlaHours);
    if (!Number.isFinite(extensionHours) || extensionHours <= 0) {
      return [];
    }

    return selectedOrders.map((order) => {
      const currentDeadline = order.slaDeadline ? new Date(order.slaDeadline) : new Date();
      const newDeadline = new Date(currentDeadline.getTime() + extensionHours * 60 * 60 * 1000);
      return {
        id: order.id,
        displayId: order.displayId || `SR-${order.id}`,
        currentDeadline,
        newDeadline,
        hasExistingDeadline: !!order.slaDeadline,
      };
    });
  }, [bulkSlaHours, selectedOrders]);

  const priorityGuardrail = useMemo(() => {
    if (!bulkPriority || bulkPriority === 'urgent') {
      return { blocked: false, items: [] as ServiceOrder[] };
    }

    const blockedItems = selectedOrders.filter((order) => {
      if ((order.priority || '').toLowerCase() !== 'urgent') return false;
      const hours = getHoursToDeadline(order.slaDeadline);
      return hours !== null && hours <= 24;
    });

    return {
      blocked: blockedItems.length > 0,
      items: blockedItems,
    };
  }, [bulkPriority, selectedOrders]);

  useEffect(() => {
    if (!autoSelectRecommended) return;
    if (bulkAssigneeTouched) return;
    if (!bulkRecommendation?.member) return;
    if (selectedIds.length === 0) return;
    setBulkAssignee(String(bulkRecommendation.member.id));
  }, [autoSelectRecommended, bulkAssigneeTouched, bulkRecommendation, selectedIds]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setBulkAssignee('unassigned');
      setBulkAssigneeTouched(false);
      setAutoSelectRecommended(true);
      setShowAssignmentPreview(false);
    }
  }, [selectedIds]);

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) {
        throw new Error('Select at least one request');
      }
      const assigneeId =
        bulkAssignee === 'unassigned' ? null : parseInt(bulkAssignee, 10);

      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          apiRequest('PATCH', `/api/service-requests/${id}`, {
            assignedTeamMember: assigneeId,
            assignmentNotes: bulkNotes,
            clientVisible: bulkClientVisible,
          })
        )
      );

      const failed = results.filter((result) => result.status === 'rejected');
      return {
        successCount: results.length - failed.length,
        failedCount: failed.length,
      };
    },
    onSuccess: ({ successCount, failedCount }) => {
      toast({
        title: 'Assignments updated',
        description:
          failedCount > 0
            ? `${successCount} updated, ${failedCount} failed`
            : `${successCount} service request${successCount === 1 ? '' : 's'} updated`,
      });
      setSelectedIds([]);
      setBulkNotes('');
      setBulkClientVisible(false);
      setBulkAssigneeTouched(false);
      queryClient.invalidateQueries({ queryKey: ['ops', 'service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue', 'stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Assignment failed',
        description: error.message || 'Unable to update assignments',
        variant: 'destructive',
      });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) {
        throw new Error('Select at least one request');
      }
      if (!bulkStatus) {
        throw new Error('Select a status to apply');
      }

      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          apiRequest('POST', `/api/service-requests/${id}/transition`, {
            toStatus: bulkStatus,
            reason: bulkStatusReason || undefined,
            notes: bulkStatusNotes || undefined,
            force: bulkForceStatus,
          })
        )
      );

      const failed = results.filter((result) => result.status === 'rejected');
      return {
        successCount: results.length - failed.length,
        failedCount: failed.length,
      };
    },
    onSuccess: ({ successCount, failedCount }) => {
      toast({
        title: 'Status updates completed',
        description:
          failedCount > 0
            ? `${successCount} updated, ${failedCount} failed`
            : `${successCount} service request${successCount === 1 ? '' : 's'} updated`,
      });
      setSelectedIds([]);
      setBulkStatus('');
      setBulkStatusReason('');
      setBulkStatusNotes('');
      setBulkForceStatus(false);
      queryClient.invalidateQueries({ queryKey: ['ops', 'service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue', 'stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Status update failed',
        description: error.message || 'Unable to update statuses',
        variant: 'destructive',
      });
    },
  });

  const bulkPriorityMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) {
        throw new Error('Select at least one request');
      }
      if (!bulkPriority) {
        throw new Error('Select a priority to apply');
      }
      if (priorityGuardrail.blocked) {
        throw new Error('Urgent items within 24h SLA cannot be downgraded');
      }

      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          apiRequest('PATCH', `/api/service-requests/${id}`, {
            priority: bulkPriority,
            priorityNotes: bulkPriorityNotes || undefined,
          })
        )
      );

      const failed = results.filter((result) => result.status === 'rejected');
      return {
        successCount: results.length - failed.length,
        failedCount: failed.length,
      };
    },
    onSuccess: ({ successCount, failedCount }) => {
      toast({
        title: 'Priority updates completed',
        description:
          failedCount > 0
            ? `${successCount} updated, ${failedCount} failed`
            : `${successCount} service request${successCount === 1 ? '' : 's'} updated`,
      });
      setSelectedIds([]);
      setBulkPriority('');
      setBulkPriorityNotes('');
      queryClient.invalidateQueries({ queryKey: ['ops', 'service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue', 'stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Priority update failed',
        description: error.message || 'Unable to update priorities',
        variant: 'destructive',
      });
    },
  });

  const bulkSlaMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) {
        throw new Error('Select at least one request');
      }
      const extensionHours = Number(bulkSlaHours);
      if (!Number.isFinite(extensionHours) || extensionHours <= 0) {
        throw new Error('Enter a valid extension in hours');
      }
      if (!bulkSlaReason.trim()) {
        throw new Error('Reason is required for SLA extension');
      }

      return apiRequest('POST', '/api/sla/exception/bulk', {
        serviceRequestIds: selectedIds,
        extensionHours,
        reason: bulkSlaReason.trim(),
        notes: bulkSlaNotes || undefined,
        clientVisible: bulkSlaClientVisible,
      });
    },
    onSuccess: (response: any) => {
      toast({
        title: 'SLA extended',
        description: `${response?.updatedCount ?? selectedIds.length} service request${selectedIds.length === 1 ? '' : 's'} updated`,
      });
      setSelectedIds([]);
      setBulkSlaHours('');
      setBulkSlaReason('');
      setBulkSlaNotes('');
      setBulkSlaClientVisible(false);
      queryClient.invalidateQueries({ queryKey: ['ops', 'service-orders'] });
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

  const selfAssignMutation = useMutation({
    mutationFn: async (serviceRequestId: number) => {
      if (!user?.id) throw new Error('User not found');
      return apiRequest('PATCH', `/api/service-requests/${serviceRequestId}`, {
        assignedTeamMember: user.id,
        assignmentNotes: 'Self-assigned from service request list',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Assigned to you',
        description: 'Service request assigned successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['ops', 'service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
    },
    onError: () => {
      toast({
        title: 'Assignment failed',
        description: 'Unable to assign this request.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground">
            Manage assignments and track execution across operations.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Refine the list by status, priority, assignee, or search.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => {
                setSelectedIds([]);
                setFilters((prev) => ({ ...prev, status: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="initiated">Initiated</SelectItem>
                <SelectItem value="docs_uploaded">Docs Uploaded</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="qc_review">QC Review</SelectItem>
                <SelectItem value="ready_for_delivery">Ready for Delivery</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(value) => {
                setSelectedIds([]);
                setFilters((prev) => ({ ...prev, priority: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select
              value={filters.assignedTo}
              onValueChange={(value) => {
                setSelectedIds([]);
                setFilters((prev) => ({ ...prev, assignedTo: value }));
              }}
              disabled={isLoadingTeamMembers}
            >
              <SelectTrigger>
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.name} • {member.role.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by ID or service"
                value={filters.search}
                onChange={(event) => {
                  setSelectedIds([]);
                  setFilters((prev) => ({ ...prev, search: event.target.value }));
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {canBulkStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk Assignment
            </CardTitle>
            <CardDescription>
              Select service requests and assign them to an operations team member.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select
                  value={bulkAssignee}
                  onValueChange={(value) => {
                    setBulkAssigneeTouched(true);
                    setBulkAssignee(value);
                  }}
                  disabled={isLoadingTeamMembers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.name} • {member.role.replace(/_/g, ' ')} • {member.activeWorkload}/{member.maxCapacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={bulkNotes}
                  onChange={(event) => setBulkNotes(event.target.value)}
                  rows={3}
                  placeholder="Add context for the assignee"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="bulk-client-visible"
                checked={bulkClientVisible}
                onCheckedChange={(checked) => setBulkClientVisible(checked === true)}
              />
              <Label htmlFor="bulk-client-visible" className="text-sm">
                Show assignment update on client timeline
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="bulk-auto-recommend"
                checked={autoSelectRecommended}
                onCheckedChange={(checked) => setAutoSelectRecommended(checked === true)}
              />
              <Label htmlFor="bulk-auto-recommend" className="text-sm">
                Auto-select recommended assignee
              </Label>
            </div>
            {bulkRecommendation?.member && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Recommended assignee: <span className="font-semibold">{bulkRecommendation.member.name}</span>
                {bulkRecommendation.hoursToDeadline !== null && (
                  <span className="ml-2 text-xs text-amber-700">
                    (SLA {bulkRecommendation.hoursToDeadline <= 0 ? 'overdue' : `in ${bulkRecommendation.hoursToDeadline}h`})
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAssignmentPreview((prev) => !prev)}
                disabled={selectedIds.length === 0}
              >
                {showAssignmentPreview ? 'Hide' : 'Preview'} suggestions
              </Button>
              <Button
                onClick={() => bulkAssignMutation.mutate()}
                disabled={bulkAssignMutation.isPending || selectedIds.length === 0}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {bulkAssignMutation.isPending
                  ? 'Assigning...'
                  : `Assign Selected (${selectedIds.length})`}
              </Button>
            </div>
            {showAssignmentPreview && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                <p className="font-medium">Suggested assignees (dry run)</p>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-700">
                  {assignmentPreview.length === 0 && <div>No items selected.</div>}
                  {assignmentPreview.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{item.displayId}</span>
                      <span className="font-medium">{item.recommended}</span>
                      <span className="text-slate-500">
                        {item.hoursToDeadline === null
                          ? 'No SLA'
                          : item.hoursToDeadline <= 0
                            ? 'Overdue'
                            : `${item.hoursToDeadline}h left`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canBulkStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bulk Status Update
            </CardTitle>
            <CardDescription>
              Apply a workflow status to selected service requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={bulkStatusReason}
                  onChange={(event) => setBulkStatusReason(event.target.value)}
                  placeholder="Reason for transition"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={bulkStatusNotes}
                onChange={(event) => setBulkStatusNotes(event.target.value)}
                rows={3}
                placeholder="Add context for this transition"
              />
            </div>
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="bulk-force-status"
                  checked={bulkForceStatus}
                  onCheckedChange={(checked) => setBulkForceStatus(checked === true)}
                />
                <Label htmlFor="bulk-force-status" className="text-sm">
                  Force invalid transitions (admin only)
                </Label>
              </div>
            )}
            {statusPreview && (
              <div className={`rounded-md border p-3 text-sm ${previewHasFailures ? 'border-red-200 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                <p className="font-medium">
                  Preview: {previewAllowed.length} will update, {previewBlocked.length} will fail
                  {previewMissing.length > 0 ? `, ${previewMissing.length} missing` : ''}
                </p>
                {previewBlocked.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-red-800">
                    {previewBlocked.slice(0, 5).map((item: any) => (
                      <div key={item.id}>
                        {item.displayId}: {item.reason}
                      </div>
                    ))}
                    {previewBlocked.length > 5 && (
                      <div>+{previewBlocked.length - 5} more blocked items</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Button
              onClick={() => bulkStatusMutation.mutate()}
              disabled={
                bulkStatusMutation.isPending ||
                selectedIds.length === 0 ||
                !bulkStatus ||
                (!bulkForceStatus && previewHasFailures)
              }
            >
              {bulkStatusMutation.isPending
                ? 'Updating...'
                : `Update Status (${selectedIds.length})`}
            </Button>
            {!bulkForceStatus && previewHasFailures && (
              <p className="text-xs text-red-600">
                Resolve blocked items or enable force (admin only) before updating.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canManagePriority && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Bulk Priority Update
            </CardTitle>
            <CardDescription>
              Adjust priority for selected service requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={bulkPriority} onValueChange={setBulkPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={bulkPriorityNotes}
                  onChange={(event) => setBulkPriorityNotes(event.target.value)}
                  rows={3}
                  placeholder="Reason for priority change"
                />
              </div>
            </div>
            {priorityGuardrail.blocked && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                Cannot downgrade urgent items within 24 hours of SLA.
                <div className="mt-2 text-xs text-red-800">
                  Blocked: {priorityGuardrail.items
                    .slice(0, 5)
                    .map((item) => item.displayId || `SR-${item.id}`)
                    .join(', ')}
                  {priorityGuardrail.items.length > 5 && ` +${priorityGuardrail.items.length - 5} more`}
                </div>
              </div>
            )}
            <Button
              onClick={() => bulkPriorityMutation.mutate()}
              disabled={
                bulkPriorityMutation.isPending ||
                selectedIds.length === 0 ||
                !bulkPriority ||
                priorityGuardrail.blocked
              }
            >
              {bulkPriorityMutation.isPending
                ? 'Updating...'
                : `Update Priority (${selectedIds.length})`}
            </Button>
          </CardContent>
        </Card>
      )}

      {canManageAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bulk SLA Extension
            </CardTitle>
            <CardDescription>
              Extend SLA deadlines for selected service requests with audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Extension (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={bulkSlaHours}
                  onChange={(event) => setBulkSlaHours(event.target.value)}
                  placeholder="e.g., 24"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={bulkSlaReason}
                  onChange={(event) => setBulkSlaReason(event.target.value)}
                  placeholder="Reason for SLA extension"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={bulkSlaNotes}
                onChange={(event) => setBulkSlaNotes(event.target.value)}
                rows={3}
                placeholder="Additional context for audit logs"
              />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="bulk-sla-client-visible"
                checked={bulkSlaClientVisible}
                onCheckedChange={(checked) => setBulkSlaClientVisible(checked === true)}
              />
              <Label htmlFor="bulk-sla-client-visible" className="text-sm">
                Show SLA update on client timeline
              </Label>
            </div>
            {slaExtensionPreview.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                <p className="font-medium">Preview SLA extension</p>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-700">
                  {slaExtensionPreview.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{item.displayId}</span>
                      <span className="text-slate-500">
                        {item.hasExistingDeadline ? item.currentDeadline.toLocaleString() : 'No SLA'}
                      </span>
                      <span className="font-medium">{item.newDeadline.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={() => bulkSlaMutation.mutate()}
              disabled={
                bulkSlaMutation.isPending ||
                selectedIds.length === 0 ||
                !bulkSlaHours ||
                !bulkSlaReason.trim()
              }
            >
              {bulkSlaMutation.isPending
                ? 'Applying...'
                : `Extend SLA (${selectedIds.length})`}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Service Request List
          </CardTitle>
          <CardDescription>
            {orders.length} request{orders.length === 1 ? '' : 's'} found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No service requests match the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canBulkStatus && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length > 0 && selectedIds.length === orders.length}
                        onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                      />
                    </TableHead>
                  )}
                  <TableHead>Request</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    {canBulkStatus && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onCheckedChange={(checked) => toggleSelectOne(order.id, checked === true)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{order.displayId || `SR-${order.id}`}</p>
                        <p className="text-xs text-muted-foreground">{order.serviceId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{order.entityName || 'Unknown Client'}</p>
                        {order.entityType && (
                          <p className="text-xs text-muted-foreground">{order.entityType}</p>
                        )}
                      </div>
                    </TableCell>
                  <TableCell>
                      <Badge variant="outline">
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.priority || 'medium'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">
                          {order.assignedToName ||
                            (order.assignedTeamMember
                              ? assigneeMap.get(order.assignedTeamMember) || `User #${order.assignedTeamMember}`
                              : 'Unassigned')}
                        </p>
                        {!order.assignedTeamMember && (
                          <Badge variant="outline" className="text-purple-600">
                            Unassigned
                          </Badge>
                        )}
                        {canManageAssignment && !order.assignedTeamMember && teamMembers.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Recommended:{' '}
                            {
                              pickRecommendedAssignee(teamMembers, order.slaDeadline)?.member
                                ?.name
                            }
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {order.slaDeadline ? new Date(order.slaDeadline).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canSelfAssign && !order.assignedTeamMember && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selfAssignMutation.mutate(order.id)}
                            disabled={selfAssignMutation.isPending}
                          >
                            Assign to me
                          </Button>
                        )}
                        <Link href={`/service-request/${order.id}`}>
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
