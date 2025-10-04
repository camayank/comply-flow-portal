import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Edit3,
  Save,
  Trash2,
  Settings,
  Users,
  FileText,
  Activity,
  BarChart3,
  Network,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Workflow,
  Database,
  Shield,
  Bell,
  Download,
  Upload,
  Eye,
  PlayCircle,
  PauseCircle,
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WorkflowStep {
  key: string;
  name: string;
  description: string;
  type: "ops_task" | "client_task" | "qa_review" | "automated";
  dependencies: string[];
  checklist: string[];
  sla_days: number;
  priority: "low" | "medium" | "high" | "urgent";
  estimated_hours: number;
  qa_required: boolean;
  required_documents?: string[];
}

interface ServiceType {
  id: number;
  service_type: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  sla_days: number;
  is_active: boolean;
  workflow_template_id?: number;
}

interface WorkflowTemplate {
  id: number;
  service_type: string;
  version: number;
  name: string;
  description: string;
  steps: WorkflowStep[];
  is_active: boolean;
}

const UniversalAdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("");
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [newStep, setNewStep] = useState<Partial<WorkflowStep>>({
    type: "ops_task",
    dependencies: [],
    checklist: [],
    sla_days: 1,
    priority: "medium",
    estimated_hours: 1,
    qa_required: false
  });
  const [isWorkflowBuilderOpen, setIsWorkflowBuilderOpen] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/admin/service-types"],
  });

  const { data: workflowTemplates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/admin/workflow-templates"],
  });

  const { data: dashboardMetrics } = useQuery({
    queryKey: ["/api/admin/dashboard-metrics"],
  });

  const { data: operationalMetrics } = useQuery({
    queryKey: ["/api/admin/operational-metrics"],
  });

  // Mutations
  const createServiceTypeMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const response = await fetch("/api/admin/service-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      if (!response.ok) throw new Error("Failed to create service type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-types"] });
      toast({ title: "Service type created successfully" });
    },
  });

  const createWorkflowTemplateMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      const response = await fetch("/api/admin/workflow-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowData),
      });
      if (!response.ok) throw new Error("Failed to create workflow template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflow-templates"] });
      toast({ title: "Workflow template created successfully" });
      setIsWorkflowBuilderOpen(false);
      setWorkflowSteps([]);
    },
  });

  const applyGlobalUpdateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch("/api/admin/apply-global-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to apply global updates");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Global updates applied", 
        description: `Updated ${data.affectedOrders} orders`
      });
    },
  });

  // Component Functions
  const addWorkflowStep = () => {
    if (!newStep.key || !newStep.name) {
      toast({ title: "Please fill in step key and name", variant: "destructive" });
      return;
    }

    setWorkflowSteps([...workflowSteps, newStep as WorkflowStep]);
    setNewStep({
      type: "ops_task",
      dependencies: [],
      checklist: [],
      sla_days: 1,
      priority: "medium",
      estimated_hours: 1,
      qa_required: false
    });
  };

  const removeWorkflowStep = (index: number) => {
    const stepKey = workflowSteps[index].key;
    setWorkflowSteps(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Remove dependencies on deleted step
      return updated.map(step => ({
        ...step,
        dependencies: step.dependencies.filter(dep => dep !== stepKey)
      }));
    });
  };

  const saveWorkflowTemplate = () => {
    if (!selectedServiceType || workflowSteps.length === 0) {
      toast({ title: "Please select service type and add workflow steps", variant: "destructive" });
      return;
    }

    createWorkflowTemplateMutation.mutate({
      service_type: selectedServiceType,
      name: `${selectedServiceType} Workflow`,
      description: `Auto-generated workflow for ${selectedServiceType}`,
      steps: workflowSteps,
      is_active: true,
      created_by: 1 // TODO: Get from auth context
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Universal Admin Control Panel
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Configure any service provider business with no-code workflows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Platform Active
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Config
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white dark:bg-gray-800 p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Active Service Orders
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(dashboardMetrics as any)?.activeOrders || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 ml-1">+12%</span>
                    <span className="text-sm text-gray-500 ml-2">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        SLA Compliance
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(dashboardMetrics as any)?.slaCompliance || 0}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 ml-2">Target: 85%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Monthly Revenue
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ₹{(dashboardMetrics as any)?.monthlyRevenue?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 ml-2">This month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Active Workflows
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {workflowTemplates?.filter(w => w.is_active)?.length || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <Network className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <Workflow className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 ml-2">No-code configured</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  System Health & Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Database</h3>
                    <p className="text-sm text-green-600">Optimal Performance</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">API Response</h3>
                    <p className="text-sm text-blue-600">85ms avg</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-sm text-purple-600">99.9% delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Service Catalog Management
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Service Type
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Service Type</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="serviceType">Service Type ID</Label>
                          <Input id="serviceType" placeholder="e.g., company_incorporation" />
                        </div>
                        <div>
                          <Label htmlFor="serviceName">Service Name</Label>
                          <Input id="serviceName" placeholder="e.g., Company Incorporation" />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="legal">Legal</SelectItem>
                              <SelectItem value="accounting">Accounting</SelectItem>
                              <SelectItem value="consulting">Consulting</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="basePrice">Base Price (₹)</Label>
                          <Input id="basePrice" type="number" placeholder="10000" />
                        </div>
                        <div>
                          <Label htmlFor="slaDays">SLA Days</Label>
                          <Input id="slaDays" type="number" placeholder="7" />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" placeholder="Describe this service type..." />
                        </div>
                        <div className="col-span-2 flex justify-end gap-3">
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={() => createServiceTypeMutation.mutate({})}>
                            Create Service Type
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceTypes.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {service.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">{service.category}</Badge>
                            <span className="text-sm text-gray-500">
                              ₹{service.base_price?.toLocaleString()}
                            </span>
                            <span className="text-sm text-gray-500">
                              {service.sla_days} days SLA
                            </span>
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows Tab - No-Code Workflow Builder */}
          <TabsContent value="workflows" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  No-Code Workflow Builder
                  <Button onClick={() => setIsWorkflowBuilderOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workflow
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowTemplates.map((workflow) => (
                    <div key={workflow.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {workflow.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Service: {workflow.service_type} | Version: {workflow.version}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant={workflow.is_active ? "default" : "secondary"}>
                              {workflow.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {workflow.steps.length} steps
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            Apply Global Update
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management & RBAC</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Role-based access control for Admin, Ops Executive, Ops Lead, Client, Agent roles
                </p>
                {/* User management UI would go here */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Operational Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Task Completion Rate
                    </h4>
                    <p className="text-3xl font-bold text-green-600">94%</p>
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Average Handle Time
                    </h4>
                    <p className="text-3xl font-bold text-blue-600">3.2 hrs</p>
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Rework Rate
                    </h4>
                    <p className="text-3xl font-bold text-orange-600">6%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Database className="w-8 h-8 mb-2" />
                    Database Backup
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Shield className="w-8 h-8 mb-2" />
                    Security Settings
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Bell className="w-8 h-8 mb-2" />
                    Notification Config
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Upload className="w-8 h-8 mb-2" />
                    Integration Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Workflow Builder Modal */}
      <Dialog open={isWorkflowBuilderOpen} onOpenChange={setIsWorkflowBuilderOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>No-Code Workflow Builder</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Service Selection */}
            <div>
              <Label htmlFor="workflowService">Select Service Type</Label>
              <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.id} value={service.service_type}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Workflow Steps */}
            <div>
              <h3 className="font-semibold mb-4">Workflow Steps ({workflowSteps.length})</h3>
              <div className="border rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-3">Add New Step</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Step Key (e.g., collect_docs)"
                    value={newStep.key || ""}
                    onChange={(e) => setNewStep({ ...newStep, key: e.target.value })}
                  />
                  <Input
                    placeholder="Step Name"
                    value={newStep.name || ""}
                    onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
                  />
                  <Select
                    value={newStep.type}
                    onValueChange={(value) => setNewStep({ ...newStep, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ops_task">Ops Task</SelectItem>
                      <SelectItem value="client_task">Client Task</SelectItem>
                      <SelectItem value="qa_review">QA Review</SelectItem>
                      <SelectItem value="automated">Automated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 flex gap-3">
                  <Input
                    type="number"
                    placeholder="SLA Days"
                    value={newStep.sla_days || ""}
                    onChange={(e) => setNewStep({ ...newStep, sla_days: parseInt(e.target.value) })}
                  />
                  <Input
                    type="number"
                    placeholder="Est. Hours"
                    value={newStep.estimated_hours || ""}
                    onChange={(e) => setNewStep({ ...newStep, estimated_hours: parseInt(e.target.value) })}
                  />
                  <Button onClick={addWorkflowStep}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Current Steps */}
              <ScrollArea className="h-60">
                <div className="space-y-3">
                  {workflowSteps.map((step, index) => (
                    <div key={index} className="border rounded p-3 flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">{step.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{step.type}</Badge>
                          <span className="text-sm text-gray-500">
                            {step.sla_days}d | {step.estimated_hours}h
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeWorkflowStep(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsWorkflowBuilderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveWorkflowTemplate}>
                <Save className="w-4 h-4 mr-2" />
                Save Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UniversalAdminPanel;