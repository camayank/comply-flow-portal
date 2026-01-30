/**
 * Playbook Management Page
 *
 * Customer Success interface for managing success playbooks:
 * - Create and edit playbook templates
 * - View and manage active playbook executions
 * - Track progress across customer journeys
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
import { Switch } from '@/components/ui/switch';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  usePlaybooks,
  usePlaybook,
  useCreatePlaybook,
  useUpdatePlaybook,
  useExecutions,
  useUpdateExecution,
  type SuccessPlaybook,
  type PlaybookExecution,
  type PlaybookStage,
} from '@/hooks/useCustomerSuccess';
import {
  BookOpen,
  Plus,
  Edit2,
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Target,
  TrendingUp,
  Loader2,
} from 'lucide-react';

export default function PlaybookManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState<SuccessPlaybook | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [executionStatusFilter, setExecutionStatusFilter] = useState<string>('all');

  const [newPlaybook, setNewPlaybook] = useState({
    name: '',
    description: '',
    triggerType: 'manual',
    stages: [{ name: 'Stage 1', duration: '7 days', tasks: [] as string[] }] as PlaybookStage[],
    isActive: true,
  });

  // Fetch playbooks
  const { data: playbooksData, isLoading: loadingPlaybooks } = usePlaybooks(
    activeFilter !== 'all' ? { isActive: activeFilter === 'active' } : {}
  );

  // Fetch executions
  const { data: executionsData, isLoading: loadingExecutions } = useExecutions(
    executionStatusFilter !== 'all' ? { status: executionStatusFilter } : {}
  );

  // Mutations
  const createMutation = useCreatePlaybook();
  const updateMutation = useUpdatePlaybook();
  const updateExecutionMutation = useUpdateExecution();

  const playbooks = playbooksData?.playbooks || [];
  const summary = playbooksData?.summary;
  const executions = executionsData?.executions || [];

  const handleCreatePlaybook = async () => {
    try {
      await createMutation.mutateAsync({
        name: newPlaybook.name,
        description: newPlaybook.description || undefined,
        triggerType: newPlaybook.triggerType,
        stages: newPlaybook.stages,
        isActive: newPlaybook.isActive,
      });
      setIsCreateOpen(false);
      setNewPlaybook({
        name: '',
        description: '',
        triggerType: 'manual',
        stages: [{ name: 'Stage 1', duration: '7 days', tasks: [] }],
        isActive: true,
      });
      toast({
        title: 'Playbook Created',
        description: 'Success playbook has been created successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create playbook',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (playbook: SuccessPlaybook) => {
    try {
      await updateMutation.mutateAsync({
        id: playbook.id,
        data: { isActive: !playbook.isActive },
      });
      toast({
        title: playbook.isActive ? 'Playbook Deactivated' : 'Playbook Activated',
        description: `${playbook.name} has been ${playbook.isActive ? 'deactivated' : 'activated'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update playbook',
        variant: 'destructive',
      });
    }
  };

  const handleExecutionAction = async (
    execution: PlaybookExecution,
    action: 'advance' | 'pause' | 'resume' | 'cancel' | 'complete'
  ) => {
    try {
      await updateExecutionMutation.mutateAsync({
        id: execution.id,
        data: { action },
      });
      toast({
        title: 'Execution Updated',
        description: `Execution has been ${action === 'advance' ? 'advanced to next stage' : action + 'd'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update execution',
        variant: 'destructive',
      });
    }
  };

  const addStage = () => {
    setNewPlaybook({
      ...newPlaybook,
      stages: [
        ...newPlaybook.stages,
        { name: `Stage ${newPlaybook.stages.length + 1}`, duration: '7 days', tasks: [] },
      ],
    });
  };

  const updateStage = (index: number, field: keyof PlaybookStage, value: string | string[]) => {
    const updatedStages = [...newPlaybook.stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setNewPlaybook({ ...newPlaybook, stages: updatedStages });
  };

  const removeStage = (index: number) => {
    if (newPlaybook.stages.length > 1) {
      setNewPlaybook({
        ...newPlaybook,
        stages: newPlaybook.stages.filter((_, i) => i !== index),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerBadge = (triggerType: string) => {
    switch (triggerType) {
      case 'onboarding':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Onboarding</Badge>;
      case 'risk_detected':
        return <Badge variant="outline" className="border-red-500 text-red-600">Risk Alert</Badge>;
      case 'milestone':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Milestone</Badge>;
      case 'manual':
        return <Badge variant="outline" className="border-gray-500 text-gray-600">Manual</Badge>;
      default:
        return <Badge variant="outline">{triggerType}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Success Playbooks
          </h1>
          <p className="text-muted-foreground">
            Manage guided customer success journeys and track execution progress.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Playbook
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Playbooks</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Playbooks</p>
                  <p className="text-2xl font-bold text-green-600">{summary.active}</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Running Executions</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.totalActiveExecutions}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.totalCompletedExecutions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="playbooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="playbooks">Playbook Templates</TabsTrigger>
          <TabsTrigger value="executions">Active Executions</TabsTrigger>
        </TabsList>

        {/* Playbooks Tab */}
        <TabsContent value="playbooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Playbook Templates</CardTitle>
                  <CardDescription>
                    Manage success playbook templates and their stages.
                  </CardDescription>
                </div>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Playbooks</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPlaybooks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : playbooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No playbooks found. Create your first playbook to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Stages</TableHead>
                      <TableHead>Executions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playbooks.map((playbook) => (
                      <TableRow key={playbook.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{playbook.name}</p>
                            {playbook.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {playbook.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTriggerBadge(playbook.triggerType)}</TableCell>
                        <TableCell>{playbook.stages?.length || 0} stages</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">{playbook.activeExecutions} active</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-blue-600">{playbook.completedExecutions} completed</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={playbook.isActive}
                            onCheckedChange={() => handleToggleActive(playbook)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPlaybook(playbook);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Executions</CardTitle>
                  <CardDescription>
                    Track and manage playbook executions for customers.
                  </CardDescription>
                </div>
                <Select value={executionStatusFilter} onValueChange={setExecutionStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingExecutions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : executions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active executions found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Playbook</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell>
                          <p className="font-medium">{execution.clientName || `Client #${execution.clientId}`}</p>
                        </TableCell>
                        <TableCell>{execution.playbookName}</TableCell>
                        <TableCell>
                          <div className="w-[150px]">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Stage {execution.currentStage}/{execution.totalStages}</span>
                              <span className="text-muted-foreground">
                                {Math.round((execution.currentStage / execution.totalStages) * 100)}%
                              </span>
                            </div>
                            <Progress
                              value={(execution.currentStage / execution.totalStages) * 100}
                              className="h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(execution.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(execution.startedAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {execution.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExecutionAction(execution, 'advance')}
                                  title="Advance to next stage"
                                >
                                  <SkipForward className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExecutionAction(execution, 'pause')}
                                  title="Pause execution"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExecutionAction(execution, 'complete')}
                                  title="Mark as complete"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              </>
                            )}
                            {execution.status === 'paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExecutionAction(execution, 'resume')}
                                title="Resume execution"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {(execution.status === 'active' || execution.status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExecutionAction(execution, 'cancel')}
                                title="Cancel execution"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
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
        </TabsContent>
      </Tabs>

      {/* Create Playbook Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Success Playbook</DialogTitle>
            <DialogDescription>
              Define a new guided customer success journey with stages and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Playbook Name</Label>
              <Input
                id="name"
                value={newPlaybook.name}
                onChange={(e) => setNewPlaybook({ ...newPlaybook, name: e.target.value })}
                placeholder="e.g., Onboarding Journey"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newPlaybook.description}
                onChange={(e) => setNewPlaybook({ ...newPlaybook, description: e.target.value })}
                placeholder="Describe what this playbook achieves..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={newPlaybook.triggerType}
                onValueChange={(value) => setNewPlaybook({ ...newPlaybook, triggerType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="onboarding">On Onboarding</SelectItem>
                  <SelectItem value="risk_detected">On Risk Detected</SelectItem>
                  <SelectItem value="milestone">On Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Stages</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stage
                </Button>
              </div>
              {newPlaybook.stages.map((stage, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Stage {index + 1}</Label>
                      {newPlaybook.stages.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStage(index)}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={stage.name}
                      onChange={(e) => updateStage(index, 'name', e.target.value)}
                      placeholder="Stage name"
                    />
                    <Input
                      value={stage.duration || ''}
                      onChange={(e) => updateStage(index, 'duration', e.target.value)}
                      placeholder="Duration (e.g., 7 days)"
                    />
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={newPlaybook.isActive}
                onCheckedChange={(checked) => setNewPlaybook({ ...newPlaybook, isActive: checked })}
              />
              <Label htmlFor="isActive">Activate immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaybook}
              disabled={!newPlaybook.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Playbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
