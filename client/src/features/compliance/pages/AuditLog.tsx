/**
 * Audit Log Viewer
 *
 * DPDP Compliance feature for viewing tamper-proof audit trails:
 * - Filterable, paginated audit log table
 * - Hash chain verification status
 * - Export functionality for compliance reporting
 * - Detail view with before/after diff
 */

import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  useAuditLogs,
  useAuditLog,
  useVerifyAuditChain,
  useExportAuditLogs,
  type AuditLogEntry,
} from '@/features/audit/hooks';
import {
  Shield,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Loader2,
  Hash,
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AuditLogViewer() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    entityType: 'all',
    action: 'all',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0,
  });
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    verifiedCount: number;
  } | null>(null);

  // Fetch audit logs
  const { data: logsData, isLoading } = useAuditLogs(filters);
  const { data: logDetail } = useAuditLog(selectedLogId || 0);

  // Mutations
  const verifyChain = useVerifyAuditChain();
  const exportLogs = useExportAuditLogs();

  const logs = logsData?.logs || [];
  const pagination = logsData?.pagination;

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyChain.mutateAsync({});
      setVerificationResult(result);
      toast({
        title: result.valid ? 'Chain Verified' : 'Chain Broken',
        description: result.valid
          ? `Successfully verified ${result.verifiedCount} entries`
          : `Chain integrity broken at entry ${result.brokenAt}`,
        variant: result.valid ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Could not verify audit chain',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast({
        title: 'Date Range Required',
        description: 'Please select start and end dates for export',
        variant: 'destructive',
      });
      return;
    }

    try {
      const blob = await exportLogs.mutateAsync({
        startDate: filters.startDate,
        endDate: filters.endDate,
        format: 'csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${filters.startDate}-${filters.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Export Complete',
        description: 'Audit log exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export audit logs',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetail = (id: number) => {
    setSelectedLogId(id);
    setIsDetailOpen(true);
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      create: 'bg-green-500',
      update: 'bg-blue-500',
      delete: 'bg-red-500',
      login: 'bg-purple-500',
      logout: 'bg-gray-500',
      view: 'bg-yellow-500',
    };
    const color = actionColors[action.toLowerCase()] || 'bg-gray-500';
    return <Badge className={color}>{action}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Audit Log Viewer
          </h1>
          <p className="text-muted-foreground">
            Tamper-proof audit trail with hash chain verification (DPDP Compliant)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleVerifyChain}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : verificationResult?.valid ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : verificationResult?.valid === false ? (
              <XCircle className="h-4 w-4 mr-2 text-red-500" />
            ) : (
              <Hash className="h-4 w-4 mr-2" />
            )}
            Verify Chain
          </Button>
          <Button onClick={handleExport} disabled={exportLogs.isPending}>
            {exportLogs.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Verification Status */}
      {verificationResult && (
        <Card className={verificationResult.valid ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {verificationResult.valid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {verificationResult.valid
                  ? `Chain integrity verified - ${verificationResult.verifiedCount} entries validated`
                  : 'Chain integrity compromised - tampering detected'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={(value) =>
                  setFilters({ ...filters, entityType: value, offset: 0 })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="service_request">Service Request</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={filters.action}
                onValueChange={(value) =>
                  setFilters({ ...filters, action: value, offset: 0 })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value, offset: 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value, offset: 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setFilters({
                    entityType: 'all',
                    action: 'all',
                    startDate: '',
                    endDate: '',
                    limit: 50,
                    offset: 0,
                  })
                }
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Entries</CardTitle>
              <CardDescription>
                {pagination?.total || 0} total entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit entries found matching your filters.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(log.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.userName || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.entityId || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {log.logHash.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(log.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {pagination.offset + 1} to{' '}
                    {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                    {pagination.total} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          offset: Math.max(0, filters.offset - filters.limit),
                        })
                      }
                      disabled={filters.offset === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          offset: filters.offset + filters.limit,
                        })
                      }
                      disabled={filters.offset + filters.limit >= pagination.total}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
            <DialogDescription>
              Complete audit trail entry with before/after comparison
            </DialogDescription>
          </DialogHeader>
          {logDetail?.log && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{formatDate(logDetail.log.timestamp)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{logDetail.log.userName || 'System'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p>{getActionBadge(logDetail.log.action)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity</Label>
                  <p className="font-medium">
                    {logDetail.log.entityType} #{logDetail.log.entityId || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p className="font-mono">{logDetail.log.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Session ID</Label>
                  <p className="font-mono text-sm">
                    {logDetail.log.sessionId || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Log Hash (SHA-256)</Label>
                <code className="block bg-muted p-2 rounded text-xs break-all">
                  {logDetail.log.logHash}
                </code>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Previous Hash</Label>
                <code className="block bg-muted p-2 rounded text-xs break-all">
                  {logDetail.log.previousHash || 'Genesis Entry'}
                </code>
              </div>

              {logDetail.log.oldValues && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Previous Values</Label>
                  <pre className="bg-red-50 dark:bg-red-950 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(logDetail.log.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {logDetail.log.newValues && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">New Values</Label>
                  <pre className="bg-green-50 dark:bg-green-950 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(logDetail.log.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
