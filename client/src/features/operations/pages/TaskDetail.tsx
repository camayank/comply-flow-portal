/**
 * Task Detail View
 *
 * Shows full task details with:
 * - Task information and status
 * - Action buttons based on status
 * - Activity log
 * - QC rejection notes (if applicable)
 */

import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { DashboardLayout } from '@/layouts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  User,
  Timer,
  AlertTriangle,
  ClipboardCheck,
  Send,
  FileText,
  Building2,
  Calendar,
  History,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  useTask,
  useUpdateTaskStatus,
  useTaskQcResult,
} from '@/features/operations/hooks';
import { format, formatDistanceToNow } from 'date-fns';

// Task status badge
function TaskStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const configs: Record<string, { color: string; label: string; icon: typeof Clock }> = {
    blocked: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Blocked', icon: Clock },
    ready: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Ready', icon: Clock },
    in_progress: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'In Progress', icon: PlayCircle },
    qc_pending: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'QC Pending', icon: ClipboardCheck },
    qc_rejected: { color: 'bg-red-100 text-red-800 border-red-200', label: 'QC Rejected', icon: AlertTriangle },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed', icon: CheckCircle },
    skipped: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Skipped', icon: XCircle },
    cancelled: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Cancelled', icon: XCircle },
  };
  const config = configs[status] || configs.blocked;
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge variant="outline" className={`${config.color} ${sizeClasses[size]} inline-flex items-center gap-1.5`}>
      <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
      {config.label}
    </Badge>
  );
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // State for dialogs
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showQcDialog, setShowQcDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [qcApproved, setQcApproved] = useState<boolean | null>(null);
  const [qcNotes, setQcNotes] = useState('');

  // Queries
  const taskQuery = useTask(taskId || '');
  const updateTaskStatus = useUpdateTaskStatus();
  const submitQcResult = useTaskQcResult();

  const task = taskQuery.data;

  // Check permissions
  const isAssignedToMe = task?.assignedTo === user?.id;
  const canDoQc = user?.role === 'ops_manager' || user?.role === 'admin' ||
    user?.role === 'super_admin' || user?.role === 'qc_reviewer';
  const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date() &&
    !['completed', 'skipped', 'cancelled'].includes(task.status);

  // Handle actions
  const handleStartTask = () => {
    if (!task) return;
    updateTaskStatus.mutate(
      { taskId: task.id, status: 'in_progress', notes: 'Task started' },
      {
        onSuccess: () => {
          toast({ title: 'Task started', description: 'You can now work on this task.' });
          taskQuery.refetch();
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleCompleteTask = () => {
    if (!task) return;
    const newStatus = task.requiresQc ? 'qc_pending' : 'completed';
    updateTaskStatus.mutate(
      { taskId: task.id, status: newStatus, notes: notes || (task.requiresQc ? 'Submitted for QC' : 'Completed') },
      {
        onSuccess: () => {
          toast({
            title: task.requiresQc ? 'Submitted for QC' : 'Task completed',
            description: task.requiresQc ? 'Task sent for quality check.' : 'Task marked as complete.',
          });
          setShowCompleteDialog(false);
          setNotes('');
          taskQuery.refetch();
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleQcDecision = () => {
    if (!task || qcApproved === null) return;
    submitQcResult.mutate(
      { taskId: task.id, approved: qcApproved, notes: qcNotes },
      {
        onSuccess: () => {
          toast({
            title: qcApproved ? 'Task approved' : 'Task rejected',
            description: qcApproved ? 'Task has been approved and marked complete.' : 'Task sent back for revision.',
          });
          setShowQcDialog(false);
          setQcApproved(null);
          setQcNotes('');
          taskQuery.refetch();
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  if (taskQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (taskQuery.error || !task) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-lg font-semibold text-red-800">Task not found</h2>
              <p className="text-red-600 mt-2">The task you're looking for doesn't exist or you don't have access.</p>
              <Link href="/ops/tasks">
                <Button className="mt-4" variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tasks
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/ops/tasks">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Tasks
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{task.name}</h1>
              <TaskStatusBadge status={task.status} size="lg" />
            </div>
            <p className="text-gray-500 mt-1">{task.taskId}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => taskQuery.refetch()}
            disabled={taskQuery.isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${taskQuery.isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* QC Rejection Alert */}
        {task.status === 'qc_rejected' && task.qcRejectionNotes && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">QC Rejection Notes</h3>
                  <p className="text-red-700 mt-1">{task.qcRejectionNotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Alert */}
        {isOverdue && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">Task Overdue</h3>
                  <p className="text-red-600 text-sm">
                    Due date was {format(new Date(task.dueDate!), 'MMM d, yyyy')} ({formatDistanceToNow(new Date(task.dueDate!), { addSuffix: true })})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.description && (
                  <div>
                    <Label className="text-gray-500">Description</Label>
                    <p className="mt-1">{task.description}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Service</Label>
                    <p className="mt-1 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {task.serviceName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Client</Label>
                    <p className="mt-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      {task.entityName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Step Number</Label>
                    <p className="mt-1">{task.stepNumber}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Assigned Role</Label>
                    <p className="mt-1">{task.assignedRole?.replace(/_/g, ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Estimated Time</Label>
                    <p className="mt-1">{task.estimatedMinutes ? `${task.estimatedMinutes} minutes` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Requires QC</Label>
                    <p className="mt-1">{task.requiresQc ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {task.dependencies && task.dependencies.length > 0 && (
                  <div>
                    <Label className="text-gray-500">Dependencies</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {task.dependencies.map((dep, i) => (
                        <Badge key={i} variant="outline">{dep}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            {(isAssignedToMe || canDoQc) && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    {isAssignedToMe ? 'You are assigned to this task' : 'You can perform QC actions'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {/* Start Task */}
                    {task.status === 'ready' && isAssignedToMe && (
                      <Button onClick={handleStartTask} disabled={updateTaskStatus.isPending}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Task
                      </Button>
                    )}

                    {/* Complete / Submit for QC */}
                    {task.status === 'in_progress' && isAssignedToMe && (
                      <Button onClick={() => setShowCompleteDialog(true)} disabled={updateTaskStatus.isPending}>
                        {task.requiresQc ? (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Submit for QC
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Complete
                          </>
                        )}
                      </Button>
                    )}

                    {/* Resubmit after QC Rejection */}
                    {task.status === 'qc_rejected' && isAssignedToMe && (
                      <Button onClick={() => setShowCompleteDialog(true)} disabled={updateTaskStatus.isPending}>
                        <Send className="h-4 w-4 mr-2" />
                        Resubmit for QC
                      </Button>
                    )}

                    {/* QC Actions */}
                    {task.status === 'qc_pending' && canDoQc && (
                      <>
                        <Button
                          variant="default"
                          onClick={() => {
                            setQcApproved(true);
                            setShowQcDialog(true);
                          }}
                          disabled={submitQcResult.isPending}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setQcApproved(false);
                            setShowQcDialog(true);
                          }}
                          disabled={submitQcResult.isPending}
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Status & Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-500">Current Status</Label>
                  <div className="mt-1">
                    <TaskStatusBadge status={task.status} />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Due Date</Label>
                  <p className={`mt-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy h:mm a') : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Created</Label>
                  <p className="mt-1">
                    {format(new Date(task.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {task.startedAt && (
                  <div>
                    <Label className="text-gray-500">Started</Label>
                    <p className="mt-1">
                      {format(new Date(task.startedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {task.completedAt && (
                  <div>
                    <Label className="text-gray-500">Completed</Label>
                    <p className="mt-1">
                      {format(new Date(task.completedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {task.assignedToName ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{task.assignedToName}</p>
                      <p className="text-sm text-gray-500">{task.assignedRole?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Badge variant="outline" className="text-purple-600">Unassigned</Badge>
                    <p className="text-sm text-gray-500 mt-2">Role: {task.assignedRole?.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Order */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Related Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/ops/case/${task.serviceRequestId}`}>
                  <Button variant="outline" className="w-full">
                    View Order #{task.serviceRequestId}
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {task.requiresQc ? 'Submit for QC Review' : 'Complete Task'}
            </DialogTitle>
            <DialogDescription>
              {task.requiresQc
                ? 'This task requires quality check before completion. Add any notes for the reviewer.'
                : 'Mark this task as complete. Add any completion notes.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteTask} disabled={updateTaskStatus.isPending}>
              {updateTaskStatus.isPending ? 'Submitting...' : task.requiresQc ? 'Submit for QC' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QC Decision Dialog */}
      <Dialog open={showQcDialog} onOpenChange={setShowQcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {qcApproved ? 'Approve Task' : 'Reject Task'}
            </DialogTitle>
            <DialogDescription>
              {qcApproved
                ? 'Confirm approval of this task. The task will be marked as complete.'
                : 'Provide feedback for rejection. The task will be sent back for revision.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{qcApproved ? 'Approval Notes (optional)' : 'Rejection Reason (required)'}</Label>
              <Textarea
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                placeholder={qcApproved ? 'Add any notes...' : 'Explain why this task needs revision...'}
                rows={4}
                required={!qcApproved}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQcDialog(false);
              setQcApproved(null);
              setQcNotes('');
            }}>
              Cancel
            </Button>
            <Button
              variant={qcApproved ? 'default' : 'destructive'}
              onClick={handleQcDecision}
              disabled={submitQcResult.isPending || (!qcApproved && !qcNotes)}
            >
              {submitQcResult.isPending ? 'Submitting...' : qcApproved ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
