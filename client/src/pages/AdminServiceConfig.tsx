import { useState, useEffect } from 'react';
import { DashboardLayout, PageShell } from '@/components/v3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Plus,
  FileText,
  Calendar,
  Users,
  Workflow,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  FileBarChart,
  Building2,
  ClipboardCheck,
  Blocks,
  Server,
  Webhook as WebhookIcon,
  Key as KeyIcon,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Service {
  id: number;
  serviceKey: string;
  name: string;
  periodicity: string;
  description: string;
  category: string;
  isActive: boolean;
}

interface WorkflowTemplate {
  id: number;
  version: number;
  templateJson: string;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
}

interface DocType {
  id: number;
  doctype: string;
  label: string;
  clientUploads: boolean;
  isDeliverable: boolean;
  stepKey: string;
  mandatory: boolean;
}

interface DueDateRule {
  id: number;
  jurisdiction: string;
  ruleJson: string;
  effectiveFrom: string;
  isActive: boolean;
}

const adminNavigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Access Reviews", href: "/admin/access-reviews", icon: ClipboardCheck },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Blueprints", href: "/admin/blueprints", icon: Blocks },
      { label: "Services", href: "/admin/services", icon: Server },
      { label: "Service Config", href: "/admin/service-config", icon: Settings },
      { label: "Documents", href: "/admin/documents", icon: FileText },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Webhooks", href: "/admin/webhooks", icon: WebhookIcon },
      { label: "API Keys", href: "/admin/api-keys", icon: KeyIcon },
    ],
  },
];

const adminUser = {
  name: "Admin",
  email: "admin@digicomply.com",
};

export default function AdminServiceConfig() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [dueDateRules, setDueDateRules] = useState<DueDateRule[]>([]);
  const [configStats, setConfigStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newService, setNewService] = useState({
    serviceKey: '',
    name: '',
    periodicity: 'MONTHLY',
    description: '',
    category: 'compliance'
  });

  const [newDocType, setNewDocType] = useState({
    doctype: '',
    label: '',
    clientUploads: true,
    isDeliverable: false,
    stepKey: '',
    mandatory: true
  });

  const [newDueDateRule, setNewDueDateRule] = useState({
    jurisdiction: 'IN',
    ruleJson: {
      periodicity: 'MONTHLY',
      dueDayOfMonth: 20,
      nudges: { tMinus: [7, 3, 1], fixedDays: [1, 2] }
    },
    effectiveFrom: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    fetchServices();
    fetchConfigStats();
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchTemplates(selectedService);
      fetchDocTypes(selectedService);
      fetchDueDateRules(selectedService);
    }
  }, [selectedService]);

  const fetchServices = async () => {
    try {
      const data = await apiRequest<Service[]>('/api/admin/services');
      setServices(data);
      if (data.length > 0 && !selectedService) {
        setSelectedService(data[0].serviceKey);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive"
      });
    }
  };

  const fetchTemplates = async (serviceKey: string) => {
    try {
      const data = await apiRequest<WorkflowTemplate[]>(`/api/admin/workflows/${serviceKey}`);
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchDocTypes = async (serviceKey: string) => {
    try {
      const data = await apiRequest<DocType[]>(`/api/admin/services/${serviceKey}/doc-types`);
      setDocTypes(data);
    } catch (error) {
      console.error('Error fetching doc types:', error);
    }
  };

  const fetchDueDateRules = async (serviceKey: string) => {
    try {
      const data = await apiRequest<DueDateRule[]>(`/api/admin/due-dates/${serviceKey}`);
      setDueDateRules(data);
    } catch (error) {
      console.error('Error fetching due date rules:', error);
    }
  };

  const fetchConfigStats = async () => {
    try {
      const data = await apiRequest<any>('/api/admin/config-stats');
      setConfigStats(data);
    } catch (error) {
      console.error('Error fetching config stats:', error);
    }
  };

  const createService = async () => {
    setLoading(true);
    try {
      await apiRequest('POST', '/api/admin/services', newService);
      toast({
        title: "Success",
        description: "Service created successfully"
      });
      fetchServices();
      setNewService({
        serviceKey: '',
        name: '',
        periodicity: 'MONTHLY',
        description: '',
        category: 'compliance'
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create service",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDocType = async () => {
    if (!selectedService) return;
    
    setLoading(true);
    try {
      await apiRequest('POST', `/api/admin/services/${selectedService}/doc-types`, newDocType);
      toast({
        title: "Success",
        description: "Document type created successfully"
      });
      fetchDocTypes(selectedService);
      setNewDocType({
        doctype: '',
        label: '',
        clientUploads: true,
        isDeliverable: false,
        stepKey: '',
        mandatory: true
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create document type",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDueDateRule = async () => {
    if (!selectedService) return;
    
    setLoading(true);
    try {
      await apiRequest('POST', `/api/admin/due-dates/${selectedService}`, newDueDateRule);
      toast({
        title: "Success",
        description: "Due date rule created successfully"
      });
      fetchDueDateRules(selectedService);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create due date rule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const seedAllServices = async () => {
    setLoading(true);
    try {
      await apiRequest('POST', '/api/admin/seed-templates');
      toast({
        title: "Success",
        description: "All services and templates seeded successfully"
      });
      fetchServices();
      fetchConfigStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed services",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const publishTemplate = async (version: number) => {
    if (!selectedService) return;

    try {
      await apiRequest('POST', `/api/admin/workflows/${selectedService}/publish`, { version });
      toast({
        title: "Success",
        description: `Template version ${version} published successfully`
      });
      fetchTemplates(selectedService);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish template",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout
      navigation={adminNavigation}
      user={adminUser}
      logo={<span className="text-xl font-bold text-primary">DigiComply</span>}
    >
      <PageShell
        title="Service Configuration"
        subtitle="Configure services, workflows, documents, and due date rules for your platform"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Service Config" },
        ]}
        actions={
          <Button onClick={seedAllServices} disabled={loading} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Seed All Default Services
          </Button>
        }
      >
        {/* Configuration Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Services</p>
                  <p className="text-2xl font-bold text-gray-900">{configStats.totalServices || 0}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published Templates</p>
                  <p className="text-2xl font-bold text-gray-900">{configStats.publishedTemplates || 0}</p>
                </div>
                <Workflow className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Entity Bindings</p>
                  <p className="text-2xl font-bold text-gray-900">{configStats.activeEntityBindings || 0}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Date Rules</p>
                  <p className="text-2xl font-bold text-gray-900">{configStats.dueDateRules || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Service Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.serviceKey}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedService === service.serviceKey
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedService(service.serviceKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{service.name}</h4>
                        <p className="text-xs text-gray-500">{service.serviceKey}</p>
                      </div>
                      <Badge variant={service.isActive ? 'default' : 'secondary'}>
                        {service.periodicity}
                      </Badge>
                    </div>
                  </div>
                ))}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Service</DialogTitle>
                      <DialogDescription>
                        Add a new service to your catalog
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serviceKey">Service Key</Label>
                        <Input
                          id="serviceKey"
                          value={newService.serviceKey}
                          onChange={(e) => setNewService({...newService, serviceKey: e.target.value})}
                          placeholder="e.g., gst_returns"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">Service Name</Label>
                        <Input
                          id="name"
                          value={newService.name}
                          onChange={(e) => setNewService({...newService, name: e.target.value})}
                          placeholder="e.g., GST Returns Filing"
                        />
                      </div>
                      <div>
                        <Label htmlFor="periodicity">Periodicity</Label>
                        <Select
                          value={newService.periodicity}
                          onValueChange={(value) => setNewService({...newService, periodicity: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ONE_TIME">One Time</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                            <SelectItem value="ANNUAL">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newService.category}
                          onValueChange={(value) => setNewService({...newService, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="incorporation">Incorporation</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="accounting">Accounting</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newService.description}
                          onChange={(e) => setNewService({...newService, description: e.target.value})}
                          placeholder="Service description..."
                        />
                      </div>
                      <Button onClick={createService} disabled={loading} className="w-full">
                        Create Service
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <div className="lg:col-span-3">
            {selectedService ? (
              <Tabs defaultValue="workflows" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="workflows">Workflows</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="duedates">Due Dates</TabsTrigger>
                </TabsList>

                {/* Workflows Tab */}
                <TabsContent value="workflows">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Workflow className="h-5 w-5" />
                        Workflow Templates for {selectedService}
                      </CardTitle>
                      <CardDescription>
                        Manage workflow templates and their versions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {templates.map((template) => (
                          <div key={template.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Version {template.version}</h4>
                                <p className="text-sm text-gray-500">
                                  Created by {template.createdBy} on {new Date(template.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {template.isPublished ? (
                                  <Badge variant="default" className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Published
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => publishTemplate(template.version)}
                                  >
                                    Publish
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View Template JSON
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(JSON.parse(template.templateJson), null, 2)}
                                </pre>
                              </details>
                            </div>
                          </div>
                        ))}
                        {templates.length === 0 && (
                          <p className="text-gray-500 text-center py-8">
                            No workflow templates found. Use "Seed All Default Services" to create default templates.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Document Types for {selectedService}
                      </CardTitle>
                      <CardDescription>
                        Manage required documents for this service
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {docTypes.map((docType) => (
                          <div key={docType.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{docType.label}</h4>
                                <p className="text-sm text-gray-500">{docType.doctype}</p>
                                {docType.stepKey && (
                                  <p className="text-xs text-blue-600">Step: {docType.stepKey}</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {docType.clientUploads && <Badge variant="outline">Client Upload</Badge>}
                                {docType.isDeliverable && <Badge variant="default">Deliverable</Badge>}
                                {docType.mandatory && <Badge variant="secondary">Mandatory</Badge>}
                              </div>
                            </div>
                          </div>
                        ))}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Document Type
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Document Type</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="doctype">Document Type Key</Label>
                                <Input
                                  id="doctype"
                                  value={newDocType.doctype}
                                  onChange={(e) => setNewDocType({...newDocType, doctype: e.target.value})}
                                  placeholder="e.g., sales_register"
                                />
                              </div>
                              <div>
                                <Label htmlFor="label">Display Label</Label>
                                <Input
                                  id="label"
                                  value={newDocType.label}
                                  onChange={(e) => setNewDocType({...newDocType, label: e.target.value})}
                                  placeholder="e.g., Sales Register (CSV)"
                                />
                              </div>
                              <div>
                                <Label htmlFor="stepKey">Workflow Step</Label>
                                <Input
                                  id="stepKey"
                                  value={newDocType.stepKey}
                                  onChange={(e) => setNewDocType({...newDocType, stepKey: e.target.value})}
                                  placeholder="e.g., data_collection"
                                />
                              </div>
                              <Button onClick={createDocType} disabled={loading} className="w-full">
                                Add Document Type
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Due Dates Tab */}
                <TabsContent value="duedates">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Due Date Rules for {selectedService}
                      </CardTitle>
                      <CardDescription>
                        Configure automatic due date calculation rules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dueDateRules.map((rule) => (
                          <div key={rule.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Jurisdiction: {rule.jurisdiction}</h4>
                                <p className="text-sm text-gray-500">
                                  Effective from: {new Date(rule.effectiveFrom).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                                {rule.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="mt-2">
                              <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View Rule Details
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                  {JSON.stringify(JSON.parse(rule.ruleJson), null, 2)}
                                </pre>
                              </details>
                            </div>
                          </div>
                        ))}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Due Date Rule
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Due Date Rule</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                                <Input
                                  id="jurisdiction"
                                  value={newDueDateRule.jurisdiction}
                                  onChange={(e) => setNewDueDateRule({...newDueDateRule, jurisdiction: e.target.value})}
                                  placeholder="e.g., IN, IN-DL, IN-MH"
                                />
                              </div>
                              <div>
                                <Label htmlFor="effectiveFrom">Effective From</Label>
                                <Input
                                  id="effectiveFrom"
                                  type="date"
                                  value={newDueDateRule.effectiveFrom}
                                  onChange={(e) => setNewDueDateRule({...newDueDateRule, effectiveFrom: e.target.value})}
                                />
                              </div>
                              <Button onClick={createDueDateRule} disabled={loading} className="w-full">
                                Add Due Date Rule
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Service</h3>
                  <p className="text-gray-500">
                    Choose a service from the left panel to configure its workflows, documents, and due date rules.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
