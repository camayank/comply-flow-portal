import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Settings, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  Save,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Zap,
  List,
  Target,
  Building2,
  Shield
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Form schemas
const serviceConfigSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  category: z.string().min(1, 'Category is required'),
  type: z.string().min(1, 'Type is required'),
  price: z.number().min(0, 'Price must be positive'),
  estimatedDays: z.number().min(1, 'Estimated days must be at least 1'),
  description: z.string().optional(),
  requiredDocs: z.array(z.string()).optional(),
  eligibilityCriteria: z.array(z.string()).optional(),
  isActive: z.boolean().default(true)
});

const checklistSchema = z.object({
  serviceId: z.string().min(1, 'Service selection required'),
  stepName: z.string().min(1, 'Step name is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['documentation', 'filing', 'approval', 'payment', 'verification']),
  isRequired: z.boolean().default(true),
  estimatedDays: z.number().min(1),
  requiredDocs: z.array(z.string()),
  dependencies: z.array(z.string()).optional(),
  formType: z.string().optional(),
  fees: z.number().min(0).optional(),
  deadlines: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional()
});

const comboTriggerSchema = z.object({
  name: z.string().min(1, 'Combo name is required'),
  triggerServices: z.array(z.string()).min(1, 'At least one trigger service required'),
  suggestedServices: z.array(z.string()).min(1, 'At least one suggested service required'),
  discount: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  description: z.string().min(1, 'Description is required'),
  isActive: z.boolean().default(true)
});

type ServiceConfig = z.infer<typeof serviceConfigSchema>;
type ChecklistItem = z.infer<typeof checklistSchema>;
type ComboTrigger = z.infer<typeof comboTriggerSchema>;

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [isComboDialogOpen, setIsComboDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    enabled: true
  });

  // Fetch workflow templates for checklist management
  const { data: workflows } = useQuery({
    queryKey: ['/api/workflow-templates'],
    enabled: true
  });

  // Fetch enhanced admin data
  const { data: serviceConfigurations } = useQuery({
    queryKey: ['/api/admin/service-configurations'],
    enabled: true
  });

  const { data: performanceReport } = useQuery({
    queryKey: ['/api/admin/performance-report'],
    enabled: true
  });

  const { data: pricingOptimization } = useQuery({
    queryKey: ['/api/admin/pricing-optimization'],
    enabled: true
  });

  const { data: clientSegmentation } = useQuery({
    queryKey: ['/api/admin/client-segmentation'],
    enabled: true
  });

  // Service configuration form
  const serviceForm = useForm<ServiceConfig>({
    resolver: zodResolver(serviceConfigSchema),
    defaultValues: {
      name: '',
      category: '',
      type: '',
      price: 0,
      estimatedDays: 1,
      description: '',
      requiredDocs: [],
      eligibilityCriteria: [],
      isActive: true
    }
  });

  // Checklist form
  const checklistForm = useForm<ChecklistItem>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      serviceId: '',
      stepName: '',
      description: '',
      type: 'documentation',
      isRequired: true,
      estimatedDays: 1,
      requiredDocs: [],
      dependencies: [],
      fees: 0
    }
  });

  // Combo trigger form
  const comboForm = useForm<ComboTrigger>({
    resolver: zodResolver(comboTriggerSchema),
    defaultValues: {
      name: '',
      triggerServices: [],
      suggestedServices: [],
      discount: 0,
      description: '',
      isActive: true
    }
  });

  // Mutations
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceConfig) => {
      return apiRequest('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsServiceDialogOpen(false);
      serviceForm.reset();
    }
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (data: ChecklistItem) => {
      return apiRequest('/api/admin/workflow-customizations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-templates'] });
      setIsChecklistDialogOpen(false);
      checklistForm.reset();
    }
  });

  const createComboMutation = useMutation({
    mutationFn: async (data: ComboTrigger) => {
      return apiRequest('/api/admin/combo-triggers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      setIsComboDialogOpen(false);
      comboForm.reset();
    }
  });

  const categories = [
    'incorporation', 'post_incorporation', 'monthly_compliance', 'quarterly_compliance',
    'annual_compliance', 'event_based', 'turnover_based', 'condition_based',
    'licenses', 'voluntary', 'audit_services', 'industry_specific'
  ];

  const serviceTypes = [
    'private_limited', 'public_limited', 'opc', 'llp', 'partnership',
    'mandatory', 'recurring_monthly', 'recurring_quarterly', 'recurring_annual',
    'event_driven', 'optional_compliance', 'professional_services'
  ];

  const stepTypes = [
    { value: 'documentation', label: 'Documentation' },
    { value: 'filing', label: 'Filing' },
    { value: 'approval', label: 'Approval' },
    { value: 'payment', label: 'Payment' },
    { value: 'verification', label: 'Verification' }
  ];

  const onSubmitService = (data: ServiceConfig) => {
    createServiceMutation.mutate(data);
  };

  const onSubmitChecklist = (data: ChecklistItem) => {
    createChecklistMutation.mutate(data);
  };

  const onSubmitCombo = (data: ComboTrigger) => {
    createComboMutation.mutate(data);
  };

  const filteredServices = Array.isArray(services) ? services.filter(service => {
    const matchesSearch = service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedService === 'all' || selectedService === '' || service.category === selectedService;
    return matchesSearch && matchesCategory;
  }) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-lg text-gray-600">
              Configure services, manage checklists, and set up combo triggers
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Settings
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Services</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.isArray(services) ? services.length : 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.isArray(workflows) ? workflows.length : 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue This Month</p>
                  <p className="text-2xl font-bold text-gray-900">₹2,45,000</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">28</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Service Config
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Combo Triggers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Optimization
            </TabsTrigger>
          </TabsList>

          {/* Service Configuration Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Service Configuration</CardTitle>
                    <CardDescription>
                      Manage compliance services, pricing, and requirements
                    </CardDescription>
                  </div>
                  <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure New Service</DialogTitle>
                        <DialogDescription>
                          Set up a new compliance service with detailed requirements
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...serviceForm}>
                        <form onSubmit={serviceForm.handleSubmit(onSubmitService)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={serviceForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Company Incorporation" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={serviceForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                          {category.replace('_', ' ').toUpperCase()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={serviceForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {serviceTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type.replace('_', ' ').toUpperCase()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={serviceForm.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price (₹)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="15000" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={serviceForm.control}
                              name="estimatedDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Days</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="15" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={serviceForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Detailed service description..."
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createServiceMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {createServiceMutation.isPending ? 'Saving...' : 'Save Service'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Services Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {service.category?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{service.type?.replace('_', ' ')}</TableCell>
                        <TableCell>₹{service.price?.toLocaleString()}</TableCell>
                        <TableCell>{service.estimatedDays || 'N/A'} days</TableCell>
                        <TableCell>
                          <Badge variant={service.isActive ? "default" : "secondary"}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Checklist Management Tab */}
          <TabsContent value="checklists">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Checklist Management</CardTitle>
                    <CardDescription>
                      Configure workflow steps and requirements for each service
                    </CardDescription>
                  </div>
                  <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Checklist Step
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Add Checklist Step</DialogTitle>
                        <DialogDescription>
                          Define a new step in the workflow process
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...checklistForm}>
                        <form onSubmit={checklistForm.handleSubmit(onSubmitChecklist)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={checklistForm.control}
                              name="serviceId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select service" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.isArray(services) && services.map((service) => (
                                        <SelectItem key={service.id} value={service.serviceId || service.id?.toString() || `service-${service.id}`}>
                                          {service.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={checklistForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Step Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {stepTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={checklistForm.control}
                            name="stepName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Step Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Document Verification" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={checklistForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Detailed description of the step..."
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={checklistForm.control}
                              name="estimatedDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Days</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="3" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={checklistForm.control}
                              name="fees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fees (₹)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="500" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsChecklistDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createChecklistMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {createChecklistMutation.isPending ? 'Saving...' : 'Save Step'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(workflows) && workflows.map((workflow) => (
                    <Card key={workflow.id} className="border-l-4 border-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{workflow.name}</CardTitle>
                            <CardDescription>{workflow.category?.replace('_', ' ').toUpperCase()}</CardDescription>
                          </div>
                          <Badge variant="outline">{workflow.steps?.length || 0} steps</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Duration:</span> {workflow.metadata?.estimatedDuration}
                          </div>
                          <div>
                            <span className="font-medium">Cost:</span> ₹{workflow.metadata?.totalCost?.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Personnel:</span> {workflow.metadata?.requiredPersonnel?.length || 0} roles
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Combo Triggers Tab */}
          <TabsContent value="combos">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Combo Triggers</CardTitle>
                    <CardDescription>
                      Set up automatic service suggestions and combo offers
                    </CardDescription>
                  </div>
                  <Dialog open={isComboDialogOpen} onOpenChange={setIsComboDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Combo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create Combo Trigger</DialogTitle>
                        <DialogDescription>
                          Configure automatic service suggestions and bundled offers
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...comboForm}>
                        <form onSubmit={comboForm.handleSubmit(onSubmitCombo)} className="space-y-4">
                          <FormField
                            control={comboForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Combo Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Startup Essentials Package" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={comboForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe the combo offer..."
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={comboForm.control}
                            name="discount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Discount Percentage</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="15" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Discount applied when multiple services are selected
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsComboDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createComboMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {createComboMutation.isPending ? 'Creating...' : 'Create Combo'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
                    <CardContent className="p-6 text-center">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">Incorporation + GST</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        When user selects incorporation, suggest GST registration with 10% discount
                      </p>
                      <Badge variant="secondary">Active</Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
                    <CardContent className="p-6 text-center">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">Annual Compliance Bundle</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Bundle all annual filings (ROC + ITR + Audit) with 15% discount
                      </p>
                      <Badge variant="secondary">Active</Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
                    <CardContent className="p-6 text-center">
                      <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2">Monthly Compliance Pack</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        TDS + GST + PF/ESI monthly filings with retainer benefits
                      </p>
                      <Badge variant="outline">Draft</Badge>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Performance Report */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Performance Report</CardTitle>
                  <CardDescription>Comprehensive service analytics and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total Services:</span>
                          <p className="text-2xl font-bold text-blue-600">{performanceReport.totalServices}</p>
                        </div>
                        <div>
                          <span className="font-medium">Total Revenue:</span>
                          <p className="text-2xl font-bold text-green-600">₹{performanceReport.totalRevenue?.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Top Performing Services:</h4>
                        <div className="space-y-2">
                          {performanceReport.topPerformingServices?.map((service, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{service.name}</span>
                              <span className="font-medium">₹{service.revenue?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Loading performance data...</div>
                  )}
                </CardContent>
              </Card>

              {/* Client Segmentation */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Segmentation Analysis</CardTitle>
                  <CardDescription>Strategic client insights and opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientSegmentation ? (
                    <div className="space-y-4">
                      {clientSegmentation.segments?.map((segment, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{segment.name}</h4>
                            <Badge variant="outline">{segment.count} clients</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Avg Spend: ₹{segment.avgSpend?.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Object.entries(segment.criteria).map(([key, value]) => `${key}: ${value}`).join(', ')}
                          </p>
                        </div>
                      ))}
                      
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Key Insights:</h4>
                        <ul className="text-sm space-y-1">
                          {clientSegmentation.insights?.map((insight, idx) => (
                            <li key={idx} className="text-gray-600">• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Loading segmentation data...</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quality Standards Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Standards & Compliance</CardTitle>
                <CardDescription>Service quality metrics and audit results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">Avg Quality Score</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">15 mins</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">99.2%</div>
                    <div className="text-sm text-gray-600">SLA Compliance</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization">
            <div className="space-y-6">
              {/* Pricing Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Optimization</CardTitle>
                  <CardDescription>AI-driven pricing recommendations and market analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {pricingOptimization ? (
                    <div className="space-y-6">
                      {/* Market Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            ₹{pricingOptimization.marketAnalysis?.averageMarketPrice?.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Avg Market Price</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {pricingOptimization.marketAnalysis?.competitivePositioning?.toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-600">Market Position</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {pricingOptimization.marketAnalysis?.priceElasticity}
                          </div>
                          <div className="text-sm text-gray-600">Price Elasticity</div>
                        </div>
                      </div>

                      {/* Pricing Recommendations */}
                      <div>
                        <h4 className="font-medium mb-3">Pricing Recommendations</h4>
                        <div className="space-y-3">
                          {pricingOptimization.recommendations?.map((rec, idx) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium">{rec.serviceId}</h5>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500">Current: ₹{rec.currentPrice?.toLocaleString()}</div>
                                  <div className="text-sm font-medium text-green-600">Suggested: ₹{rec.suggestedPrice?.toLocaleString()}</div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{rec.reasoning}</p>
                              <div className="text-sm font-medium text-blue-600">{rec.expectedImpact}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bundling Opportunities */}
                      <div>
                        <h4 className="font-medium mb-3">Bundling Opportunities</h4>
                        <div className="space-y-3">
                          {pricingOptimization.bundlingOpportunities?.map((bundle, idx) => (
                            <div key={idx} className="border rounded-lg p-4 bg-yellow-50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="font-medium">Bundle: {bundle.services?.join(' + ')}</h5>
                                  <div className="text-sm text-gray-600">Demand: {bundle.demandForecast}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm line-through text-gray-500">₹{bundle.individualTotal?.toLocaleString()}</div>
                                  <div className="text-lg font-bold text-green-600">₹{bundle.bundlePrice?.toLocaleString()}</div>
                                  <div className="text-sm text-green-600">Save ₹{bundle.savings?.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">Loading optimization data...</div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue Optimization Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Optimization Actions</CardTitle>
                  <CardDescription>Actionable recommendations to boost revenue and efficiency</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Immediate Actions
                      </h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Implement dynamic pricing for premium services</li>
                        <li>• Launch startup bundle campaign (15% discount)</li>
                        <li>• Optimize monthly compliance package pricing</li>
                        <li>• Introduce enterprise retainer plans</li>
                      </ul>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        Strategic Initiatives
                      </h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Develop AI-powered compliance automation</li>
                        <li>• Expand into new compliance categories</li>
                        <li>• Create white-label partnership program</li>
                        <li>• Build predictive compliance analytics</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;