/**
 * Data Deletion Requests
 *
 * GDPR/DPDP Compliance feature for managing data subject requests:
 * - Data erasure (Right to be forgotten)
 * - Data portability (Export)
 * - Data rectification
 * - Processing restriction
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useDataRequests,
  useCreateDataRequest,
  useProcessDataRequest,
  useUpdateDataRequest,
  type DataDeletionRequest,
} from '@/hooks/useAudit';
import {
  Trash2,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Mail,
  FileText,
  Loader2,
  AlertTriangle,
  Shield,
} from 'lucide-react';

export default function DataDeletionRequests() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [newRequest, setNewRequest] = useState({
    subjectEmail: '',
    subjectName: '',
    requestType: 'erasure' as 'erasure' | 'portability' | 'rectification' | 'restriction',
  });

  // Fetch requests
  const { data: requestsData, isLoading } = useDataRequests({
    status: statusFilter || undefined,
    requestType: typeFilter || undefined,
  });

  // Mutations
  const createMutation = useCreateDataRequest();
  const processMutation = useProcessDataRequest();
  const updateMutation = useUpdateDataRequest();

  const requests = requestsData?.requests || [];
  const summary = requestsData?.summary || {};

  const handleCreateRequest = async () => {
    if (!newRequest.subjectEmail || !newRequest.requestType) {
      toast({
        title: 'Missing Information',
        description: 'Please provide subject email and request type',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        subjectEmail: newRequest.subjectEmail,
        subjectName: newRequest.subjectName || undefined,
        requestType: newRequest.requestType,
      });
      setIsCreateOpen(false);
      setNewRequest({ subjectEmail: '', subjectName: '', requestType: 'erasure' });
      toast({
        title: 'Request Created',
        description: 'Data request has been created and verification email will be sent.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create data request',
        variant: 'destructive',
      });
    }
  };

  const handleProcess = async (id: number) => {
    try {
      await processMutation.mutateAsync(id);
      toast({
        title: 'Processing Started',
        description: 'Data request is now being processed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: 'completed' },
      });
      toast({
        title: 'Request Completed',
        description: 'Data request has been marked as completed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: 'rejected', rejectionReason: reason },
      });
      toast({
        title: 'Request Rejected',
        description: 'Data request has been rejected.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-500',
      verified: 'bg-blue-500',
      processing: 'bg-purple-500',
      completed: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    return <Badge className={statusStyles[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
      erasure: { bg: 'border-red-500 text-red-600', icon: <Trash2 className="h-3 w-3" /> },
      portability: { bg: 'border-blue-500 text-blue-600', icon: <Download className="h-3 w-3" /> },
      rectification: { bg: 'border-yellow-500 text-yellow-600', icon: <FileText className="h-3 w-3" /> },
      restriction: { bg: 'border-purple-500 text-purple-600', icon: <Shield className="h-3 w-3" /> },
    };
    const style = typeStyles[type] || { bg: 'border-gray-500', icon: null };
    return (
      <Badge variant="outline" className={style.bg}>
        <span className="flex items-center gap-1">
          {style.icon}
          {type}
        </span>
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Data Subject Requests
          </h1>
          <p className="text-muted-foreground">
            Manage GDPR/DPDP data deletion and portability requests
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-blue-600">{summary.verified || 0}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-purple-600">{summary.processing || 0}</p>
              </div>
              <Loader2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{summary.completed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{summary.rejected || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>
                Data subject requests requiring action
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="erasure">Erasure</SelectItem>
                  <SelectItem value="portability">Portability</SelectItem>
                  <SelectItem value="rectification">Rectification</SelectItem>
                  <SelectItem value="restriction">Restriction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data requests found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.subjectEmail}</p>
                        {request.subjectName && (
                          <p className="text-sm text-muted-foreground">{request.subjectName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(request.requestType)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(request.verifiedAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(request.completedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === 'verified' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProcess(request.id)}
                            disabled={processMutation.isPending}
                          >
                            <Play className="h-4 w-4 text-purple-500" />
                          </Button>
                        )}
                        {request.status === 'processing' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleComplete(request.id)}
                            disabled={updateMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        {(request.status === 'pending' || request.status === 'verified') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(request.id, 'Request rejected by administrator')}
                            disabled={updateMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        {request.exportUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(request.exportUrl!, '_blank')}
                          >
                            <Download className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Request Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Data Request</DialogTitle>
            <DialogDescription>
              Create a new GDPR/DPDP data subject request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subjectEmail">Subject Email *</Label>
              <Input
                id="subjectEmail"
                type="email"
                value={newRequest.subjectEmail}
                onChange={(e) => setNewRequest({ ...newRequest, subjectEmail: e.target.value })}
                placeholder="subject@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input
                id="subjectName"
                value={newRequest.subjectName}
                onChange={(e) => setNewRequest({ ...newRequest, subjectName: e.target.value })}
                placeholder="Full name (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type *</Label>
              <Select
                value={newRequest.requestType}
                onValueChange={(value: any) => setNewRequest({ ...newRequest, requestType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="erasure">Data Erasure (Right to be forgotten)</SelectItem>
                  <SelectItem value="portability">Data Portability (Export)</SelectItem>
                  <SelectItem value="rectification">Data Rectification (Correction)</SelectItem>
                  <SelectItem value="restriction">Processing Restriction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">DPDP Compliance Notice</p>
                  <p>A verification email will be sent to the subject. The request will only be processed after verification.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={!newRequest.subjectEmail || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
