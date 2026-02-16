import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import {
  Settings, Plus, Package, Wrench, BarChart3, Copy, Edit3, Trash2,
  Clock, DollarSign, Users, TrendingUp, CheckCircle, AlertCircle,
  Filter, Search, Tag, Download, Upload, Activity
} from 'lucide-react';
import { BulkUploadDialogEnhanced, ColumnDefinition, BulkUploadResult } from '@/components/BulkUploadDialogEnhanced';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ServiceDefinition {
  id: number;
  serviceCode: string;
  name: string;
  description: string;
  category: string;
  serviceType: string;
  basePrice: number;
  slaHours: number;
  complexityLevel: string;
  averageRating: number;
  completionRate: number;
  onTimeDeliveryRate: number;
  isActive: boolean;
  isConfigurable: boolean;
  tags: string[];
  prerequisites: string[];
  serviceDependencies: string[];
  createdAt: string;
}

interface TaskTemplate {
  id: number;
  templateCode: string;
  name: string;
  description: string;
  taskType: string;
  category: string;
  skillLevel: string;
  estimatedDuration: number;
  usageCount: number;
  averageCompletionTime: number;
  successRate: number;
  isActive: boolean;
  tags: string[];
  requiredSkills: string[];
  createdAt: string;
}

interface ServiceConfiguration {
  id: number;
  serviceDefinitionId: number;
  configurationName: string;
  version: string;
  isActive: boolean;
  isDefault: boolean;
  clientTypes: string[];
  entityTypes: string[];
  createdAt: string;
}

interface ServiceAnalytics {
  totalServices: number;
  activeServices: number;
  totalTaskTemplates: number;
  totalConfigurations: number;
  performanceMetrics: {
    avgServiceRating: number;
    avgCompletionTime: number;
    onTimeDeliveryRate: number;
  };
  categoryDistribution: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  complexityAnalysis: Array<{
    level: string;
    count: number;
    avgDuration: number;
  }>;
}

// Bulk upload column definitions for services
const serviceBulkColumns: ColumnDefinition[] = [
  { key: 'serviceCode', label: 'Service Code', type: 'text', required: true, placeholder: 'SVC001' },
  { key: 'name', label: 'Service Name', type: 'text', required: true, placeholder: 'GST Registration' },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'Service description' },
  { key: 'category', label: 'Category', type: 'select', required: true, options: [
    { value: 'incorporation', label: 'Incorporation' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'tax', label: 'Tax' },
    { value: 'legal', label: 'Legal' },
    { value: 'accounting', label: 'Accounting' },
  ]},
  { key: 'serviceType', label: 'Service Type', type: 'select', required: true, options: [
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'custom', label: 'Custom' },
  ]},
  { key: 'basePrice', label: 'Base Price (₹)', type: 'number', required: true, placeholder: '5000' },
  { key: 'slaHours', label: 'SLA Hours', type: 'number', placeholder: '48' },
  { key: 'complexityLevel', label: 'Complexity', type: 'select', options: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'expert', label: 'Expert' },
  ]},
];

export default function ServiceManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedComplexity, setSelectedComplexity] = useState('all');
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [activeTab, setActiveTab] = useState('services');
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch service definitions
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['service-definitions', searchQuery, selectedCategory, selectedComplexity, selectedServiceType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedComplexity !== 'all') params.append('complexityLevel', selectedComplexity);
      if (selectedServiceType !== 'all') params.append('serviceType', selectedServiceType);
      
      const response = await fetch(`/api/services/definitions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    }
  });

  // Fetch task templates
  const { data: taskTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['task-templates', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/services/task-templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch task templates');
      return response.json();
    }
  });

  // Fetch service configurations
  const { data: configurations } = useQuery({
    queryKey: ['service-configurations'],
    queryFn: async () => {
      const response = await fetch('/api/services/configurations');
      if (!response.ok) throw new Error('Failed to fetch configurations');
      return response.json();
    }
  });

  // Fetch service analytics
  const { data: analytics } = useQuery({
    queryKey: ['service-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/services/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Duplicate service mutation
  const duplicateService = useMutation({
    mutationFn: async ({ serviceId, newCode, newName }: { serviceId: number; newCode: string; newName: string }) => {
      return apiRequest(`/api/services/definitions/${serviceId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ newCode, newName })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-definitions'] });
      toast({
        title: "Service Duplicated",
        description: "Service has been successfully duplicated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete service mutation
  const deleteService = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest(`/api/services/definitions/${serviceId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-definitions'] });
      toast({
        title: "Service Deleted",
        description: "Service has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'expert': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-yellow-100 text-yellow-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBulkUpload = async (data: Record<string, any>[]): Promise<BulkUploadResult> => {
    try {
      const response = await fetch('/api/services/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: data }),
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['service-definitions'] });
        return { success: result.created || data.length, failed: result.failed || 0, errors: result.errors || [] };
      }
      return { success: 0, failed: data.length, errors: [result.message || 'Bulk upload failed'] };
    } catch (error: any) {
      return { success: 0, failed: data.length, errors: [error.message || 'Network error'] };
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Service & Task Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage service definitions, task templates, and configurations
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-bulk-operations">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Operations
              </Button>
              <Button variant="outline" data-testid="button-export-catalog">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button data-testid="button-create-service">
                <Plus className="h-4 w-4 mr-2" />
                Create Service
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services and tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-services"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="incorporation">Incorporation</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
                <SelectTrigger className="w-32" data-testid="select-complexity">
                  <SelectValue placeholder="Complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                <SelectTrigger className="w-32" data-testid="select-service-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold" data-testid="text-total-services">{analytics.totalServices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wrench className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Task Templates</p>
                    <p className="text-2xl font-bold" data-testid="text-total-templates">{analytics.totalTaskTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Configurations</p>
                    <p className="text-2xl font-bold" data-testid="text-total-configurations">{analytics.totalConfigurations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                    <p className="text-2xl font-bold" data-testid="text-avg-rating">
                      {analytics.performanceMetrics.avgServiceRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="services">Service Definitions</TabsTrigger>
              <TabsTrigger value="templates">Task Templates</TabsTrigger>
              <TabsTrigger value="configurations">Configurations</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services">
              {servicesLoading ? (
                <div className="grid gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {servicesData?.services?.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {servicesData.total} services found
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)} data-testid="button-create-bulk">
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Import
                        </Button>
                      </div>
                      
                      {servicesData.services.map((service: ServiceDefinition) => (
                        <Card key={service.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-lg">{service.name}</CardTitle>
                                  <Badge variant={service.isActive ? "default" : "secondary"}>
                                    {service.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  {service.isConfigurable && (
                                    <Badge variant="outline">Configurable</Badge>
                                  )}
                                </div>
                                <CardDescription className="line-clamp-2">
                                  {service.description}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateService.mutate({ 
                                    serviceId: service.id, 
                                    newCode: `${service.serviceCode}_copy`, 
                                    newName: `${service.name} (Copy)` 
                                  })}
                                  data-testid={`button-duplicate-${service.id}`}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`button-edit-${service.id}`}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteService.mutate(service.id)}
                                  data-testid={`button-delete-${service.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Price</p>
                                <p className="font-medium flex items-center">
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  ₹{service.basePrice}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">SLA</p>
                                <p className="font-medium flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {service.slaHours}h
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Rating</p>
                                <p className="font-medium">
                                  ⭐ {service.averageRating ? service.averageRating.toFixed(1) : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">On-time Delivery</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={service.onTimeDeliveryRate || 0} className="flex-1" />
                                  <span className="text-sm">{service.onTimeDeliveryRate?.toFixed(0) || 0}%</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={getComplexityColor(service.complexityLevel)}>
                                  {service.complexityLevel}
                                </Badge>
                                <Badge className={getServiceTypeColor(service.serviceType)}>
                                  {service.serviceType}
                                </Badge>
                                <Badge variant="outline">{service.category}</Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                {service.prerequisites?.length > 0 && (
                                  <span>
                                    <AlertCircle className="h-4 w-4 inline mr-1" />
                                    {service.prerequisites.length} prerequisites
                                  </span>
                                )}
                                {service.serviceDependencies?.length > 0 && (
                                  <span>
                                    <Activity className="h-4 w-4 inline mr-1" />
                                    {service.serviceDependencies.length} dependencies
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {service.tags && service.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {service.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No services found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {searchQuery ? 'Try adjusting your search terms or filters.' : 'Get started by creating your first service.'}
                      </p>
                      <Button data-testid="button-create-first-service">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Service
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Task Templates Tab */}
            <TabsContent value="templates">
              {templatesLoading ? (
                <div className="grid gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {taskTemplates?.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {taskTemplates.length} task templates
                        </span>
                        <Button data-testid="button-create-template">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Template
                        </Button>
                      </div>
                      
                      {taskTemplates.map((template: TaskTemplate) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {template.description}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button variant="ghost" size="sm" data-testid={`button-edit-template-${template.id}`}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`button-delete-template-${template.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Duration</p>
                                <p className="font-medium">
                                  <Clock className="h-4 w-4 inline mr-1" />
                                  {template.estimatedDuration} min
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Usage</p>
                                <p className="font-medium">
                                  <Users className="h-4 w-4 inline mr-1" />
                                  {template.usageCount} times
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Success Rate</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={template.successRate || 0} className="flex-1" />
                                  <span className="text-sm">{template.successRate?.toFixed(0) || 0}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Avg Time</p>
                                <p className="font-medium">
                                  {template.averageCompletionTime || 0} min
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{template.taskType}</Badge>
                                <Badge variant="outline">{template.category}</Badge>
                                <Badge className={getComplexityColor(template.skillLevel)}>
                                  {template.skillLevel}
                                </Badge>
                              </div>
                            </div>
                            
                            {template.requiredSkills && template.requiredSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                <span className="text-sm text-gray-600 mr-2">Required skills:</span>
                                {template.requiredSkills.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No task templates found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Create reusable task templates to streamline your workflows.
                      </p>
                      <Button data-testid="button-create-first-template">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Template
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Configurations Tab */}
            <TabsContent value="configurations">
              <div className="space-y-4">
                {configurations?.length > 0 ? (
                  configurations.map((config: ServiceConfiguration) => (
                    <Card key={config.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{config.configurationName}</CardTitle>
                            <CardDescription>Version {config.version}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={config.isActive ? "default" : "secondary"}>
                              {config.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {config.isDefault && <Badge variant="outline">Default</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Client Types</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {config.clientTypes.map((type, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Entity Types</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {config.entityTypes.map((type, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No configurations found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Create service configurations for different client types and scenarios.
                    </p>
                    <Button data-testid="button-create-first-config">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Configuration
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance">
              <div className="grid gap-6">
                {analytics && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Category Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analytics.categoryDistribution.map((category, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm">{category.category}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{category.count} services</Badge>
                                  <span className="text-sm font-medium">₹{category.revenue}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Complexity Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analytics.complexityAnalysis.map((complexity, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={getComplexityColor(complexity.level)}>
                                    {complexity.level}
                                  </Badge>
                                  <span className="text-sm">{complexity.count} services</span>
                                </div>
                                <span className="text-sm">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {complexity.avgDuration}h avg
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialogEnhanced
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        title="Bulk Import Services"
        description="Upload multiple service definitions at once using Excel or CSV file"
        columns={serviceBulkColumns}
        onUpload={handleBulkUpload}
        sampleData={[
          { serviceCode: 'GST-REG', name: 'GST Registration', description: 'New GST registration service', category: 'tax', serviceType: 'standard', basePrice: 2999, slaHours: 48, complexityLevel: 'low' },
          { serviceCode: 'PVT-INC', name: 'Private Limited Incorporation', description: 'Company registration with MCA', category: 'incorporation', serviceType: 'premium', basePrice: 9999, slaHours: 168, complexityLevel: 'medium' },
        ]}
      />
    </DashboardLayout>
  );
}