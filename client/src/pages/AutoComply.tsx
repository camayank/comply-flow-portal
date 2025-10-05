import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Clock,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Settings,
  History,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function AutoComply() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const { data: automations, isLoading } = useQuery({
    queryKey: ['/api/workflows/automation'],
  });

  const { data: history } = useQuery({
    queryKey: ['/api/workflows/history'],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: any) =>
      apiRequest(`/api/workflows/automation/${id}`, 'PATCH', { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/automation'] });
      toast({ title: "Success", description: "Workflow updated" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/workflows/trigger', 'POST', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/history'] });
      toast({
        title: "Workflow Triggered",
        description: `Executed ${data.actionsExecuted} actions successfully`,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading AutoComply...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-3 rounded-xl">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AutoComply</h1>
              <p className="text-muted-foreground">AI-Powered Compliance Workflow Builder</p>
            </div>
          </div>
          <Button onClick={() => setShowBuilder(true)} data-testid="button-create-workflow">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automations?.filter((a: any) => a.enabled).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{history?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">98.5%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127 hrs</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="workflows" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">Execution History</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Automation Workflows</CardTitle>
                <CardDescription>
                  Manage your automated compliance workflows and triggers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automations?.map((workflow: any) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onToggle={(enabled) =>
                        toggleMutation.mutate({ id: workflow.id, enabled })
                      }
                      onTrigger={() =>
                        triggerMutation.mutate({
                          trigger: workflow.trigger,
                          entityId: 1,
                          entityType: 'test',
                        })
                      }
                      onEdit={() => setSelectedWorkflow(workflow)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Templates</CardTitle>
                <CardDescription>
                  Pre-built automation templates to get started quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TemplateCard
                    title="Client Onboarding"
                    description="Welcome email + task assignment + document checklist"
                    icon={<Mail className="h-5 w-5" />}
                    trigger="client_registered"
                    onUse={() => {
                      setTemplateData({
                        name: "Client Onboarding",
                        trigger: "client_registered",
                        actions: [
                          { type: "send_email", template: "WELCOME_EMAIL" },
                          { type: "create_task", title: "Initial consultation call" },
                        ]
                      });
                      setShowBuilder(true);
                    }}
                  />
                  <TemplateCard
                    title="Payment Reminder"
                    description="Auto-remind clients 24hrs before payment due"
                    icon={<Clock className="h-5 w-5" />}
                    trigger="payment_due_soon"
                    onUse={() => {
                      setTemplateData({
                        name: "Payment Reminder",
                        trigger: "payment_due_soon",
                        actions: [
                          { type: "send_email", template: "PAYMENT_REMINDER" },
                          { type: "send_whatsapp", message: "Payment due tomorrow" },
                        ]
                      });
                      setShowBuilder(true);
                    }}
                  />
                  <TemplateCard
                    title="Compliance Alert"
                    description="GST/TDS deadline reminders with WhatsApp notification"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    trigger="compliance_due_soon"
                    onUse={() => {
                      setTemplateData({
                        name: "Compliance Alert",
                        trigger: "compliance_due_soon",
                        actions: [
                          { type: "send_email", template: "COMPLIANCE_ALERT" },
                          { type: "send_whatsapp", message: "Compliance deadline approaching" },
                        ]
                      });
                      setShowBuilder(true);
                    }}
                  />
                  <TemplateCard
                    title="Referral Credit"
                    description="Auto-credit wallet when referral completes service"
                    icon={<Sparkles className="h-5 w-5" />}
                    trigger="referral_completed"
                    onUse={() => {
                      setTemplateData({
                        name: "Referral Credit",
                        trigger: "referral_completed",
                        actions: [
                          { type: "credit_wallet", amount: 10, unit: "percent" },
                          { type: "send_email", template: "REFERRAL_CREDITED" },
                        ]
                      });
                      setShowBuilder(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Execution History</CardTitle>
                <CardDescription>Recent workflow executions and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history?.map((execution: any) => (
                    <ExecutionCard key={execution.id} execution={execution} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Workflow Builder Modal */}
        {showBuilder && (
          <WorkflowBuilder 
            onClose={() => {
              setShowBuilder(false);
              setTemplateData(null);
            }}
            initialData={templateData}
          />
        )}

        {/* Edit Workflow Modal */}
        {selectedWorkflow && (
          <WorkflowEditor
            workflow={selectedWorkflow}
            onClose={() => setSelectedWorkflow(null)}
          />
        )}
      </div>
    </div>
  );
}

function WorkflowCard({ workflow, onToggle, onTrigger, onEdit }: any) {
  const triggerIcons: Record<string, any> = {
    client_registered: Mail,
    payment_due_soon: Clock,
    milestone_completed: CheckCircle2,
    referral_completed: Sparkles,
    compliance_due_soon: AlertTriangle,
  };

  const TriggerIcon = triggerIcons[workflow.trigger] || Zap;

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TriggerIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{workflow.name}</h3>
              {workflow.enabled ? (
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Paused</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Trigger: <code className="bg-muted px-2 py-0.5 rounded">{workflow.trigger}</code>
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{workflow.actions?.length} actions</span>
              {workflow.conditions && workflow.conditions.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-muted-foreground">
                    {workflow.conditions.length} conditions
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={workflow.enabled}
            onCheckedChange={onToggle}
            data-testid={`switch-workflow-${workflow.id}`}
          />
          <Button variant="outline" size="sm" onClick={onTrigger}>
            <Play className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ title, description, icon, trigger, onUse }: any) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">{icon}</div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onUse}
          data-testid={`button-use-template-${trigger}`}
        >
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}

function ExecutionCard({ execution }: any) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            execution.status === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          {execution.status === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <p className="font-medium">{execution.workflow}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(execution.executedAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{execution.actionsExecuted} actions</p>
        <Badge variant={execution.status === 'success' ? 'default' : 'destructive'}>
          {execution.status}
        </Badge>
      </div>
    </div>
  );
}

function WorkflowBuilder({ onClose, initialData }: any) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    trigger: initialData?.trigger || '',
    actions: initialData?.actions || [],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/workflows/automation', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/automation'] });
      toast({ title: "Success", description: "Workflow created successfully" });
      onClose();
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.trigger) {
      toast({ 
        title: "Error", 
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{initialData ? 'Create from Template' : 'Create New Workflow'}</CardTitle>
          <CardDescription>
            {initialData ? `Using template: ${initialData.name}` : 'Build a custom automation workflow'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Workflow Name</Label>
            <Input
              placeholder="e.g., Payment Reminder Automation"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-workflow-name"
            />
          </div>
          <div>
            <Label>Trigger Event</Label>
            <Select value={formData.trigger} onValueChange={(value) => setFormData({ ...formData, trigger: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_registered">Client Registered</SelectItem>
                <SelectItem value="payment_due_soon">Payment Due Soon</SelectItem>
                <SelectItem value="milestone_completed">Milestone Completed</SelectItem>
                <SelectItem value="referral_completed">Referral Completed</SelectItem>
                <SelectItem value="compliance_due_soon">Compliance Due Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.actions.length > 0 && (
            <div>
              <Label>Actions (from template)</Label>
              <div className="space-y-2 mt-2">
                {formData.actions.map((action: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="font-medium">{action.type}</span>
                    </div>
                    {action.template && (
                      <p className="text-sm text-muted-foreground ml-6">Template: {action.template}</p>
                    )}
                    {action.message && (
                      <p className="text-sm text-muted-foreground ml-6">Message: {action.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-create-workflow"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowEditor({ workflow, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Workflow: {workflow.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold">Actions</h3>
            {workflow.actions?.map((action: any, index: number) => (
              <div key={index} className="border rounded-lg p-3 flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{action.type}</p>
                  {action.template && (
                    <p className="text-sm text-muted-foreground">Template: {action.template}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
