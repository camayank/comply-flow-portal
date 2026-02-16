/**
 * Security Incidents
 *
 * Track and manage security incidents for compliance:
 * - Incident reporting and tracking
 * - Severity classification
 * - Containment and resolution workflow
 * - Audit trail for SOC2/ISO27001
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  useSecurityIncidents,
  useCreateSecurityIncident,
  useUpdateSecurityIncident,
  type SecurityIncident,
} from '@/features/audit/hooks';
import {
  ShieldAlert,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Loader2,
  Eye,
  Edit,
  FileText,
  Users,
  Calendar,
  ArrowRight,
  Shield,
  XCircle,
  Activity,
} from 'lucide-react';

export default function SecurityIncidents() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    incidentType: 'security_breach' as string,
    affectedSystems: '',
    affectedUsers: '',
  });

  // Fetch incidents
  const { data: incidentsData, isLoading } = useSecurityIncidents({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
  });

  // Mutations
  const createMutation = useCreateSecurityIncident();
  const updateMutation = useUpdateSecurityIncident();

  const incidents = incidentsData?.incidents || [];
  const summary = incidentsData?.summary || {};

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCreateIncident = async () => {
    if (!newIncident.title || !newIncident.description) {
      toast({
        title: 'Missing Information',
        description: 'Please provide incident title and description',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: newIncident.title,
        description: newIncident.description,
        severity: newIncident.severity,
        incidentType: newIncident.incidentType,
        affectedSystems: newIncident.affectedSystems ? newIncident.affectedSystems.split(',').map(s => s.trim()) : [],
        affectedUsers: newIncident.affectedUsers ? parseInt(newIncident.affectedUsers) : undefined,
      });
      setIsCreateOpen(false);
      setNewIncident({
        title: '',
        description: '',
        severity: 'medium',
        incidentType: 'security_breach',
        affectedSystems: '',
        affectedUsers: '',
      });
      toast({
        title: 'Incident Reported',
        description: 'Security incident has been logged and assigned.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create security incident',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (id: number, status: string, resolution?: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          status: status as any,
          resolution,
          resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
        },
      });
      toast({
        title: 'Status Updated',
        description: `Incident status changed to ${status}.`,
      });
      setSelectedIncident(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update incident status',
        variant: 'destructive',
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      critical: { bg: 'bg-red-600 text-white', icon: <AlertTriangle className="h-3 w-3" /> },
      high: { bg: 'bg-orange-500 text-white', icon: <AlertCircle className="h-3 w-3" /> },
      medium: { bg: 'bg-yellow-500 text-white', icon: <Activity className="h-3 w-3" /> },
      low: { bg: 'bg-blue-500 text-white', icon: <Shield className="h-3 w-3" /> },
    };
    const style = styles[severity] || { bg: 'bg-gray-500', icon: null };
    return (
      <Badge className={style.bg}>
        <span className="flex items-center gap-1">
          {style.icon}
          {severity.toUpperCase()}
        </span>
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      reported: { bg: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      investigating: { bg: 'bg-yellow-100 text-yellow-800', icon: <Search className="h-3 w-3" /> },
      contained: { bg: 'bg-blue-100 text-blue-800', icon: <Shield className="h-3 w-3" /> },
      resolved: { bg: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      closed: { bg: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const style = styles[status] || { bg: 'bg-gray-100', icon: null };
    return (
      <Badge className={style.bg} variant="outline">
        <span className="flex items-center gap-1">
          {style.icon}
          {status}
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

  const incidentTypes = [
    { value: 'security_breach', label: 'Security Breach' },
    { value: 'data_leak', label: 'Data Leak' },
    { value: 'unauthorized_access', label: 'Unauthorized Access' },
    { value: 'malware', label: 'Malware/Virus' },
    { value: 'phishing', label: 'Phishing Attack' },
    { value: 'ddos', label: 'DDoS Attack' },
    { value: 'insider_threat', label: 'Insider Threat' },
    { value: 'policy_violation', label: 'Policy Violation' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Security Incidents
          </h1>
          <p className="text-muted-foreground">
            Track and manage security incidents for SOC2/ISO27001 compliance
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} variant="destructive">
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{summary.critical || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High</p>
                <p className="text-2xl font-bold text-orange-600">{summary.high || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.open || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investigating</p>
                <p className="text-2xl font-bold text-blue-600">{summary.investigating || 0}</p>
              </div>
              <Search className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{summary.resolved || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Incidents</CardTitle>
              <CardDescription>Security incidents requiring attention</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="contained">Contained</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
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
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security incidents found.</p>
              <p className="text-sm mt-2">All systems operating normally.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id} className={incident.severity === 'critical' ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {incident.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{incident.incidentType?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                    <TableCell>{getStatusBadge(incident.status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(incident.reportedAt)}</TableCell>
                    <TableCell>{incident.assignedToName || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedIncident(incident)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Incident Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Report Security Incident
            </DialogTitle>
            <DialogDescription>
              Document a security incident for tracking and compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Incident Title *</Label>
              <Input
                id="title"
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                placeholder="Brief description of the incident"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={newIncident.severity}
                  onValueChange={(value: any) => setNewIncident({ ...newIncident, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical - Immediate action required</SelectItem>
                    <SelectItem value="high">High - Urgent attention needed</SelectItem>
                    <SelectItem value="medium">Medium - Address soon</SelectItem>
                    <SelectItem value="low">Low - Monitor and track</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Incident Type *</Label>
                <Select
                  value={newIncident.incidentType}
                  onValueChange={(value) => setNewIncident({ ...newIncident, incidentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newIncident.description}
                onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                placeholder="Detailed description of what happened, when, and how it was discovered..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systems">Affected Systems</Label>
                <Input
                  id="systems"
                  value={newIncident.affectedSystems}
                  onChange={(e) => setNewIncident({ ...newIncident, affectedSystems: e.target.value })}
                  placeholder="API, Database, Auth (comma-separated)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="users">Affected Users Count</Label>
                <Input
                  id="users"
                  type="number"
                  value={newIncident.affectedUsers}
                  onChange={(e) => setNewIncident({ ...newIncident, affectedUsers: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium">Compliance Notice</p>
                  <p>This incident will be logged in the immutable audit trail for SOC2/ISO27001 compliance.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCreateIncident}
              disabled={!newIncident.title || !newIncident.description || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Report Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getSeverityBadge(selectedIncident.severity)}
                  {selectedIncident.title}
                </DialogTitle>
                <DialogDescription>
                  Incident #{selectedIncident.id} - {getStatusBadge(selectedIncident.status)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">{selectedIncident.incidentType?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reported</Label>
                    <p className="font-medium">{formatDate(selectedIncident.reportedAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reported By</Label>
                    <p className="font-medium">{selectedIncident.reportedByName || `User #${selectedIncident.reportedBy}`}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Assigned To</Label>
                    <p className="font-medium">{selectedIncident.assignedToName || 'Unassigned'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedIncident.description}</p>
                </div>

                {selectedIncident.affectedSystems && (
                  <div>
                    <Label className="text-muted-foreground">Affected Systems</Label>
                    <div className="flex gap-2 mt-1">
                      {(selectedIncident.affectedSystems as string[]).map((system, idx) => (
                        <Badge key={idx} variant="outline">{system}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedIncident.resolution && (
                  <div>
                    <Label className="text-muted-foreground">Resolution</Label>
                    <p className="mt-1 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">{selectedIncident.resolution}</p>
                  </div>
                )}

                {/* Status Update Actions */}
                {selectedIncident.status !== 'closed' && (
                  <div className="border-t pt-4">
                    <Label>Update Status</Label>
                    <div className="flex gap-2 mt-2">
                      {selectedIncident.status === 'reported' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'investigating')}
                          disabled={updateMutation.isPending}
                        >
                          Start Investigation
                        </Button>
                      )}
                      {selectedIncident.status === 'investigating' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'contained')}
                          disabled={updateMutation.isPending}
                        >
                          Mark Contained
                        </Button>
                      )}
                      {selectedIncident.status === 'contained' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved', 'Incident resolved and remediation complete.')}
                          disabled={updateMutation.isPending}
                        >
                          Mark Resolved
                        </Button>
                      )}
                      {selectedIncident.status === 'resolved' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(selectedIncident.id, 'closed')}
                          disabled={updateMutation.isPending}
                        >
                          Close Incident
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedIncident(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
