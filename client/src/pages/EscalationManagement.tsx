import { useState } from 'react';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  TrendingUp,
  XCircle,
  Zap,
  Activity,
  Users,
  Timer,
} from 'lucide-react';
import {
  useEscalationRules,
  useEscalationRule,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useToggleEscalationRule,
  useSLABreaches,
  useAcknowledgeSLABreach,
  useResolveSLABreach,
  useEscalationEngineStatus,
  useTriggerEscalationCheck,
  useWorkQueue,
} from '@/hooks/useOperations';
import { useToast } from '@/hooks/use-toast';
import { SLA_STATUSES, STATUS_COLORS, STATUS_LABELS } from '@/constants';

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  major: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  breach: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  time_based: 'Time Based',
  sla_based: 'SLA Based',
  status_based: 'Status Based',
};

export default function EscalationManagement() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch data
  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useEscalationRules();
  const { data: breachesData, isLoading: breachesLoading, refetch: refetchBreaches } = useSLABreaches();
  const { data: engineStatus, refetch: refetchEngine } = useEscalationEngineStatus();
  const { data: workQueueData } = useWorkQueue();

  // Mutations
  const createRule = useCreateEscalationRule();
  const toggleRule = useToggleEscalationRule();
  const acknowledgeBreach = useAcknowledgeSLABreach();
  const resolveBreach = useResolveSLABreach();
  const triggerCheck = useTriggerEscalationCheck();

  // Form state for creating new rule
  const [newRule, setNewRule] = useState({
    ruleKey: '',
    ruleName: '',
    description: '',
    triggerType: 'time_based' as const,
    triggerHours: 24,
    serviceKey: '',
    priority: '',
    autoReassign: false,
    notifyClient: false,
    createIncident: false,
    escalationTiers: [
      { tier: 1, thresholdPercent: 75, severity: 'warning', notifyRoles: ['manager'], actions: ['notify'] },
      { tier: 2, thresholdPercent: 100, severity: 'breach', notifyRoles: ['manager', 'director'], actions: ['notify', 'reassign'] },
    ] as Array<{ tier: number; thresholdPercent: number; severity: string; notifyRoles: string[]; actions: string[] }>,
  });

  const handleCreateRule = async () => {
    if (!newRule.ruleKey || !newRule.ruleName) {
      toast({
        title: 'Validation Error',
        description: 'Rule key and name are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createRule.mutateAsync(newRule);
      toast({
        title: 'Rule Created',
        description: 'Escalation rule has been created successfully',
      });
      setIsCreateDialogOpen(false);
      setNewRule({
        ruleKey: '',
        ruleName: '',
        description: '',
        triggerType: 'time_based',
        triggerHours: 24,
        serviceKey: '',
        priority: '',
        autoReassign: false,
        notifyClient: false,
        createIncident: false,
        escalationTiers: [
          { tier: 1, thresholdPercent: 75, severity: 'warning', notifyRoles: ['manager'], actions: ['notify'] },
          { tier: 2, thresholdPercent: 100, severity: 'breach', notifyRoles: ['manager', 'director'], actions: ['notify', 'reassign'] },
        ],
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create escalation rule',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRule = async (ruleId: number, currentStatus: boolean) => {
    try {
      await toggleRule.mutateAsync({ ruleId, isActive: !currentStatus });
      toast({
        title: currentStatus ? 'Rule Deactivated' : 'Rule Activated',
        description: `Escalation rule has been ${currentStatus ? 'deactivated' : 'activated'}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive',
      });
    }
  };

  const handleAcknowledgeBreach = async (breachId: number) => {
    try {
      await acknowledgeBreach.mutateAsync({ breachId });
      toast({
        title: 'Breach Acknowledged',
        description: 'SLA breach has been acknowledged',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge breach',
        variant: 'destructive',
      });
    }
  };

  const handleResolveBreach = async () => {
    if (!selectedBreach || !resolutionNotes) {
      toast({
        title: 'Validation Error',
        description: 'Resolution notes are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await resolveBreach.mutateAsync({ breachId: selectedBreach, resolutionNotes });
      toast({
        title: 'Breach Resolved',
        description: 'SLA breach has been resolved',
      });
      setSelectedBreach(null);
      setResolutionNotes('');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to resolve breach',
        variant: 'destructive',
      });
    }
  };

  const handleTriggerCheck = async () => {
    try {
      await triggerCheck.mutateAsync();
      toast({
        title: 'Check Triggered',
        description: 'Escalation check has been triggered successfully',
      });
      refetchRules();
      refetchBreaches();
      refetchEngine();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to trigger escalation check',
        variant: 'destructive',
      });
    }
  };

  // Calculate summary stats
  const stats = {
    totalRules: rulesData?.rules?.length || 0,
    activeRules: rulesData?.rules?.filter((r: { isActive: boolean }) => r.isActive).length || 0,
    totalBreaches: breachesData?.breaches?.length || 0,
    pendingBreaches: breachesData?.breaches?.filter((b: { remediationStatus: string }) => b.remediationStatus === 'pending').length || 0,
    atRiskItems: workQueueData?.items?.filter((i: { slaStatus: string }) => i.slaStatus === 'at_risk').length || 0,
    breachedItems: workQueueData?.items?.filter((i: { slaStatus: string }) => i.slaStatus === 'breached').length || 0,
  };

  const filteredRules = rulesData?.rules?.filter((rule: { ruleName: string; ruleKey: string }) =>
    rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.ruleKey.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredBreaches = breachesData?.breaches?.filter((breach: { breachType: string; breachSeverity: string }) =>
    breach.breachType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    breach.breachSeverity.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/operations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                Escalation Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Configure escalation rules and monitor SLA breaches
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTriggerCheck}
              variant="outline"
              disabled={triggerCheck.isPending}
            >
              {triggerCheck.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Run Check Now
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Escalation Rule</DialogTitle>
                  <DialogDescription>
                    Configure when and how service requests should be escalated
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ruleKey">Rule Key</Label>
                      <Input
                        id="ruleKey"
                        placeholder="e.g., sla_warning_gst"
                        value={newRule.ruleKey}
                        onChange={(e) => setNewRule({ ...newRule, ruleKey: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ruleName">Rule Name</Label>
                      <Input
                        id="ruleName"
                        placeholder="e.g., GST SLA Warning"
                        value={newRule.ruleName}
                        onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe when this rule applies..."
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="triggerType">Trigger Type</Label>
                      <Select
                        value={newRule.triggerType}
                        onValueChange={(value: 'time_based' | 'sla_based' | 'status_based') =>
                          setNewRule({ ...newRule, triggerType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time_based">Time Based</SelectItem>
                          <SelectItem value="sla_based">SLA Based</SelectItem>
                          <SelectItem value="status_based">Status Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="triggerHours">Trigger Hours</Label>
                      <Input
                        id="triggerHours"
                        type="number"
                        value={newRule.triggerHours}
                        onChange={(e) =>
                          setNewRule({ ...newRule, triggerHours: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serviceKey">Service Key (optional)</Label>
                      <Input
                        id="serviceKey"
                        placeholder="e.g., gst_registration"
                        value={newRule.serviceKey}
                        onChange={(e) => setNewRule({ ...newRule, serviceKey: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority (optional)</Label>
                      <Select
                        value={newRule.priority}
                        onValueChange={(value) => setNewRule({ ...newRule, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoReassign">Auto-reassign on escalation</Label>
                      <Switch
                        id="autoReassign"
                        checked={newRule.autoReassign}
                        onCheckedChange={(checked) =>
                          setNewRule({ ...newRule, autoReassign: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifyClient">Notify client on escalation</Label>
                      <Switch
                        id="notifyClient"
                        checked={newRule.notifyClient}
                        onCheckedChange={(checked) =>
                          setNewRule({ ...newRule, notifyClient: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="createIncident">Create incident on breach</Label>
                      <Switch
                        id="createIncident"
                        checked={newRule.createIncident}
                        onCheckedChange={(checked) =>
                          setNewRule({ ...newRule, createIncident: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateRule}
                      disabled={createRule.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createRule.isPending ? 'Creating...' : 'Create Rule'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Rules</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalRules}</p>
                </div>
                <Settings className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Active Rules</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeRules}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">At Risk</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.atRiskItems}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Breached</p>
                  <p className="text-2xl font-bold text-red-600">{stats.breachedItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Breaches</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.totalBreaches}</p>
                </div>
                <XCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pending</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.pendingBreaches}</p>
                </div>
                <Timer className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engine Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    engineStatus?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <div>
                  <p className="font-medium">Escalation Engine</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {engineStatus?.isRunning ? 'Running' : 'Stopped'} •{' '}
                    Last check: {engineStatus?.lastCheck ? new Date(engineStatus.lastCheck).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    engineStatus?.isRunning
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }
                >
                  {engineStatus?.isRunning ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchRules();
                    refetchBreaches();
                    refetchEngine();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search rules or breaches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Settings className="h-4 w-4 mr-2" />
              Rules ({stats.totalRules})
            </TabsTrigger>
            <TabsTrigger value="breaches">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Breaches ({stats.totalBreaches})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Rules Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Active Escalation Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rulesLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRules.slice(0, 5).map((rule: { id: number; ruleName: string; triggerType: string; isActive: boolean }) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{rule.ruleName}</p>
                            <p className="text-sm text-gray-500">
                              {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                            </p>
                          </div>
                          <Badge
                            className={
                              rule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                      {filteredRules.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No rules configured</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Breaches */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Recent SLA Breaches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {breachesLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredBreaches.slice(0, 5).map((breach: { id: number; breachType: string; breachSeverity: string; remediationStatus: string; breachedAt: string }) => (
                        <div
                          key={breach.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium capitalize">{breach.breachType.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(breach.breachedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge className={SEVERITY_COLORS[breach.breachSeverity] || 'bg-gray-100'}>
                            {breach.breachSeverity}
                          </Badge>
                        </div>
                      ))}
                      {filteredBreaches.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No breaches recorded</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Trigger Type</TableHead>
                      <TableHead>Trigger Hours</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No escalation rules found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRules.map((rule: { id: number; ruleName: string; ruleKey: string; triggerType: string; triggerHours: number | null; serviceKey: string | null; isActive: boolean }) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rule.ruleName}</p>
                              <p className="text-sm text-gray-500">{rule.ruleKey}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                            </Badge>
                          </TableCell>
                          <TableCell>{rule.triggerHours || '-'}h</TableCell>
                          <TableCell>{rule.serviceKey || 'All'}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rule.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={rule.isActive}
                                onCheckedChange={() => handleToggleRule(rule.id, rule.isActive)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breaches Tab */}
          <TabsContent value="breaches" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SR ID</TableHead>
                      <TableHead>Breach Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>SLA / Actual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Breached At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breachesLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(7)].map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredBreaches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No SLA breaches recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBreaches.map((breach: { id: number; serviceRequestId: number; breachType: string; breachSeverity: string; slaHours: number | null; actualHours: number | null; remediationStatus: string; breachedAt: string }) => (
                        <TableRow key={breach.id}>
                          <TableCell>#{breach.serviceRequestId}</TableCell>
                          <TableCell className="capitalize">
                            {breach.breachType.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>
                            <Badge className={SEVERITY_COLORS[breach.breachSeverity] || 'bg-gray-100'}>
                              {breach.breachSeverity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {breach.slaHours}h / {breach.actualHours}h
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                breach.remediationStatus === 'resolved'
                                  ? 'bg-green-100 text-green-800'
                                  : breach.remediationStatus === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {breach.remediationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(breach.breachedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {breach.remediationStatus === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAcknowledgeBreach(breach.id)}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              {breach.remediationStatus !== 'resolved' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => setSelectedBreach(breach.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Resolve
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Resolve SLA Breach</DialogTitle>
                                      <DialogDescription>
                                        Provide resolution notes for this SLA breach
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                      <div>
                                        <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                                        <Textarea
                                          id="resolutionNotes"
                                          placeholder="Describe how this breach was resolved..."
                                          value={resolutionNotes}
                                          onChange={(e) => setResolutionNotes(e.target.value)}
                                        />
                                      </div>
                                      <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setSelectedBreach(null)}>
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={handleResolveBreach}
                                          disabled={resolveBreach.isPending}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          {resolveBreach.isPending ? 'Resolving...' : 'Mark Resolved'}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
