/**
 * Renewal Pipeline Page
 *
 * Customer Success interface for managing contract renewals:
 * - View renewal opportunities by status
 * - Track renewal pipeline value
 * - Manage renewal risks and actions
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  useRenewals,
  useCreateRenewal,
  useUpdateRenewal,
  type RenewalOpportunity,
} from '@/hooks/useCustomerSuccess';
import {
  RefreshCw,
  Plus,
  Edit2,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Loader2,
  Users,
  Target,
} from 'lucide-react';

export default function RenewalPipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalOpportunity | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');

  const [newRenewal, setNewRenewal] = useState({
    clientId: '',
    contractType: 'subscription',
    currentValue: '',
    renewalValue: '',
    renewalDate: '',
    probability: '50',
    notes: '',
  });

  // Build filters
  const filters: { status?: string; daysUntil?: number } = {};
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (daysFilter !== 'all') filters.daysUntil = parseInt(daysFilter);

  // Fetch renewals
  const { data: renewalsData, isLoading } = useRenewals(filters);

  // Mutations
  const createMutation = useCreateRenewal();
  const updateMutation = useUpdateRenewal();

  const renewals = renewalsData?.renewals || [];
  const summary = renewalsData?.summary;

  const handleCreateRenewal = async () => {
    try {
      await createMutation.mutateAsync({
        clientId: parseInt(newRenewal.clientId),
        contractType: newRenewal.contractType,
        currentValue: newRenewal.currentValue ? parseFloat(newRenewal.currentValue) : undefined,
        renewalValue: newRenewal.renewalValue ? parseFloat(newRenewal.renewalValue) : undefined,
        renewalDate: newRenewal.renewalDate,
        probability: newRenewal.probability ? parseInt(newRenewal.probability) : undefined,
        notes: newRenewal.notes || undefined,
      });
      setIsCreateOpen(false);
      setNewRenewal({
        clientId: '',
        contractType: 'subscription',
        currentValue: '',
        renewalValue: '',
        renewalDate: '',
        probability: '50',
        notes: '',
      });
      toast({
        title: 'Renewal Created',
        description: 'Renewal opportunity has been added to the pipeline.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create renewal opportunity',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (renewal: RenewalOpportunity, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: renewal.id,
        data: { status: newStatus } as any,
      });
      toast({
        title: 'Status Updated',
        description: `Renewal status changed to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update renewal status',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProbability = async (renewal: RenewalOpportunity, probability: number) => {
    try {
      await updateMutation.mutateAsync({
        id: renewal.id,
        data: { probability } as any,
      });
      toast({
        title: 'Probability Updated',
        description: `Renewal probability set to ${probability}%.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update probability',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Upcoming</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'at_risk':
        return <Badge variant="destructive">At Risk</Badge>;
      case 'renewed':
        return <Badge className="bg-green-500">Renewed</Badge>;
      case 'churned':
        return <Badge variant="destructive">Churned</Badge>;
      case 'downgraded':
        return <Badge variant="secondary">Downgraded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysUntilBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Overdue by {Math.abs(days)} days</Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive">{days} days</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-yellow-500">{days} days</Badge>;
    } else if (days <= 90) {
      return <Badge variant="outline">{days} days</Badge>;
    } else {
      return <Badge variant="secondary">{days} days</Badge>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Renewal Pipeline
          </h1>
          <p className="text-muted-foreground">
            Track and manage contract renewals to maximize retention.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Renewal
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Renewals</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalPipeline)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">At Risk Value</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.atRiskValue)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Due in 30 Days</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.dueIn30Days}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Probability</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.avgProbability}%</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Renewal Opportunities</CardTitle>
              <CardDescription>
                Manage renewal opportunities and track progress.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="renewed">Renewed</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Next 7 Days</SelectItem>
                  <SelectItem value="30">Next 30 Days</SelectItem>
                  <SelectItem value="90">Next 90 Days</SelectItem>
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
          ) : renewals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No renewal opportunities found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Renewal Value</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewals.map((renewal) => (
                  <TableRow key={renewal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {renewal.client?.name || `Client #${renewal.clientId}`}
                        </p>
                        {renewal.owner && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {renewal.owner.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{renewal.contractType || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(renewal.currentValue)}</TableCell>
                    <TableCell>
                      {renewal.renewalValue ? (
                        <div className="flex items-center gap-1">
                          {formatCurrency(renewal.renewalValue)}
                          {renewal.currentValue && renewal.renewalValue > renewal.currentValue ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : renewal.currentValue && renewal.renewalValue < renewal.currentValue ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">
                          {new Date(renewal.renewalDate).toLocaleDateString()}
                        </p>
                        {getDaysUntilBadge(renewal.daysUntilRenewal)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-[100px]">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{renewal.probability || 50}%</span>
                        </div>
                        <Progress
                          value={renewal.probability || 50}
                          className={`h-2 ${
                            (renewal.probability || 50) >= 70
                              ? '[&>div]:bg-green-500'
                              : (renewal.probability || 50) >= 40
                              ? '[&>div]:bg-yellow-500'
                              : '[&>div]:bg-red-500'
                          }`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(renewal.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Select
                          value={renewal.status}
                          onValueChange={(value) => handleUpdateStatus(renewal, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="renewed">Renewed</SelectItem>
                            <SelectItem value="churned">Churned</SelectItem>
                            <SelectItem value="downgraded">Downgraded</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRenewal(renewal);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
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

      {/* Create Renewal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Renewal Opportunity</DialogTitle>
            <DialogDescription>
              Create a new renewal opportunity to track.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="number"
                value={newRenewal.clientId}
                onChange={(e) => setNewRenewal({ ...newRenewal, clientId: e.target.value })}
                placeholder="Enter client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contract Type</Label>
              <Select
                value={newRenewal.contractType}
                onValueChange={(value) => setNewRenewal({ ...newRenewal, contractType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="retainer">Retainer</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="annual">Annual Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentValue">Current Value</Label>
                <Input
                  id="currentValue"
                  type="number"
                  value={newRenewal.currentValue}
                  onChange={(e) => setNewRenewal({ ...newRenewal, currentValue: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalValue">Renewal Value</Label>
                <Input
                  id="renewalValue"
                  type="number"
                  value={newRenewal.renewalValue}
                  onChange={(e) => setNewRenewal({ ...newRenewal, renewalValue: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewalDate">Renewal Date</Label>
              <Input
                id="renewalDate"
                type="date"
                value={newRenewal.renewalDate}
                onChange={(e) => setNewRenewal({ ...newRenewal, renewalDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={newRenewal.probability}
                onChange={(e) => setNewRenewal({ ...newRenewal, probability: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newRenewal.notes}
                onChange={(e) => setNewRenewal({ ...newRenewal, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRenewal}
              disabled={!newRenewal.clientId || !newRenewal.renewalDate || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Renewal Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Renewal</DialogTitle>
            <DialogDescription>
              Update renewal details and probability.
            </DialogDescription>
          </DialogHeader>
          {selectedRenewal && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <p className="text-sm font-medium">
                  {selectedRenewal.client?.name || `Client #${selectedRenewal.clientId}`}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <p className="text-sm">{selectedRenewal.contractType || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <Label>Renewal Date</Label>
                <p className="text-sm">
                  {new Date(selectedRenewal.renewalDate).toLocaleDateString()} (
                  {selectedRenewal.daysUntilRenewal} days)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editProbability">Probability (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="editProbability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedRenewal.probability || 50}
                    className="w-24"
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (value !== selectedRenewal.probability) {
                        handleUpdateProbability(selectedRenewal, value);
                      }
                    }}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              {selectedRenewal.riskFactors && selectedRenewal.riskFactors.length > 0 && (
                <div className="space-y-2">
                  <Label>Risk Factors</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedRenewal.riskFactors.map((factor: string, index: number) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedRenewal.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedRenewal.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
