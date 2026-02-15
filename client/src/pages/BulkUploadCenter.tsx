/**
 * Bulk Upload Center - Unified bulk data import for all modules
 * Central hub for importing data across Leads, Clients, Entities, Services, Tasks, and Compliance
 */

import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Users, Building2, Briefcase, FileText, CheckSquare,
  ClipboardCheck, ArrowRight, Download, History, AlertCircle
} from 'lucide-react';
import { BulkUploadDialogEnhanced, ColumnDefinition, BulkUploadResult } from '@/components/BulkUploadDialogEnhanced';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Module configuration type
interface BulkUploadModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  columns: ColumnDefinition[];
  sampleData: Record<string, any>[];
  endpoint: string;
  requiredPermission?: string;
}

// Lead columns
const leadColumns: ColumnDefinition[] = [
  { key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Acme Corp' },
  { key: 'contactPerson', label: 'Contact Person', type: 'text', required: true, placeholder: 'John Doe' },
  { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'john@acme.com' },
  { key: 'phone', label: 'Phone', type: 'phone', required: true, placeholder: '+919876543210' },
  {
    key: 'leadSource', label: 'Lead Source', type: 'select', required: false,
    options: [
      { value: 'website', label: 'Website' },
      { value: 'referral', label: 'Referral' },
      { value: 'cold_call', label: 'Cold Call' },
      { value: 'social_media', label: 'Social Media' },
      { value: 'event', label: 'Event' },
      { value: 'partner', label: 'Partner' },
      { value: 'google_ads', label: 'Google Ads' },
      { value: 'other', label: 'Other' },
    ]
  },
  { key: 'requirementSummary', label: 'Requirements', type: 'text', placeholder: 'GST registration required' },
  { key: 'estimatedValue', label: 'Est. Value (₹)', type: 'number', placeholder: '50000' },
  {
    key: 'stage', label: 'Stage', type: 'select',
    options: [
      { value: 'new', label: 'New' },
      { value: 'hot', label: 'Hot' },
      { value: 'warm', label: 'Warm' },
      { value: 'cold', label: 'Cold' },
    ]
  },
];

// Client columns
const clientColumns: ColumnDefinition[] = [
  { key: 'name', label: 'Client Name', type: 'text', required: true, placeholder: 'ABC Enterprises' },
  {
    key: 'entityType', label: 'Entity Type', type: 'select', required: true,
    options: [
      { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
      { value: 'partnership', label: 'Partnership' },
      { value: 'llp', label: 'LLP' },
      { value: 'private_limited', label: 'Private Limited' },
      { value: 'public_limited', label: 'Public Limited' },
      { value: 'opc', label: 'One Person Company' },
    ]
  },
  { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'contact@abc.com' },
  { key: 'phone', label: 'Phone', type: 'phone', required: true, placeholder: '+919876543210' },
  { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'Mumbai' },
  {
    key: 'state', label: 'State', type: 'select', required: true,
    options: [
      { value: 'MH', label: 'Maharashtra' },
      { value: 'DL', label: 'Delhi' },
      { value: 'KA', label: 'Karnataka' },
      { value: 'TN', label: 'Tamil Nadu' },
      { value: 'GJ', label: 'Gujarat' },
      { value: 'WB', label: 'West Bengal' },
      { value: 'RJ', label: 'Rajasthan' },
      { value: 'UP', label: 'Uttar Pradesh' },
      { value: 'HR', label: 'Haryana' },
      { value: 'PB', label: 'Punjab' },
      { value: 'AP', label: 'Andhra Pradesh' },
      { value: 'TS', label: 'Telangana' },
      { value: 'KL', label: 'Kerala' },
      { value: 'MP', label: 'Madhya Pradesh' },
      { value: 'BR', label: 'Bihar' },
      { value: 'OR', label: 'Odisha' },
      { value: 'JH', label: 'Jharkhand' },
      { value: 'AS', label: 'Assam' },
      { value: 'CH', label: 'Chhattisgarh' },
      { value: 'UK', label: 'Uttarakhand' },
      { value: 'HP', label: 'Himachal Pradesh' },
      { value: 'GA', label: 'Goa' },
      { value: 'JK', label: 'Jammu & Kashmir' },
      { value: 'OTHER', label: 'Other' },
    ]
  },
  {
    key: 'industry', label: 'Industry', type: 'select',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail', label: 'Retail' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'finance', label: 'Finance' },
      { value: 'education', label: 'Education' },
      { value: 'real_estate', label: 'Real Estate' },
      { value: 'hospitality', label: 'Hospitality' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'ecommerce', label: 'E-commerce' },
      { value: 'other', label: 'Other' },
    ]
  },
  { key: 'pan', label: 'PAN', type: 'text', placeholder: 'ABCDE1234F',
    validation: (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val) || 'Invalid PAN format'
  },
  { key: 'gstin', label: 'GSTIN', type: 'text', placeholder: '27ABCDE1234F1Z5',
    validation: (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/.test(val) || 'Invalid GSTIN format'
  },
  { key: 'relationshipManager', label: 'Relationship Manager', type: 'text', placeholder: 'RM Name' },
];

// Entity columns
const entityColumns: ColumnDefinition[] = [
  { key: 'name', label: 'Business Name', type: 'text', required: true, placeholder: 'XYZ Traders' },
  {
    key: 'entityType', label: 'Entity Type', type: 'select', required: true,
    options: [
      { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
      { value: 'partnership', label: 'Partnership' },
      { value: 'llp', label: 'LLP' },
      { value: 'private_limited', label: 'Private Limited' },
      { value: 'public_limited', label: 'Public Limited' },
      { value: 'opc', label: 'One Person Company' },
    ]
  },
  {
    key: 'pan', label: 'PAN', type: 'text', required: true, placeholder: 'ABCDE1234F',
    validation: (val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val) || 'PAN must be in format: ABCDE1234F'
  },
  {
    key: 'gstin', label: 'GSTIN', type: 'text', placeholder: '27ABCDE1234F1Z5',
    validation: (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/.test(val) || 'Invalid GSTIN format'
  },
  { key: 'cin', label: 'CIN', type: 'text', placeholder: 'U12345MH2020PTC123456' },
  { key: 'address', label: 'Address', type: 'text', placeholder: '123 Main Street' },
  { key: 'city', label: 'City', type: 'text', placeholder: 'Mumbai' },
  {
    key: 'state', label: 'State', type: 'select', required: true,
    options: [
      { value: 'MH', label: 'Maharashtra' },
      { value: 'DL', label: 'Delhi' },
      { value: 'KA', label: 'Karnataka' },
      { value: 'TN', label: 'Tamil Nadu' },
      { value: 'GJ', label: 'Gujarat' },
      { value: 'OTHER', label: 'Other' },
    ]
  },
  {
    key: 'industryType', label: 'Industry', type: 'select',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail', label: 'Retail' },
      { value: 'services', label: 'Services' },
      { value: 'other', label: 'Other' },
    ]
  },
];

// Service columns
const serviceColumns: ColumnDefinition[] = [
  { key: 'serviceCode', label: 'Service Code', type: 'text', required: true, placeholder: 'SVC001' },
  { key: 'name', label: 'Service Name', type: 'text', required: true, placeholder: 'GST Registration' },
  { key: 'description', label: 'Description', type: 'text', required: true, placeholder: 'GST registration service' },
  {
    key: 'category', label: 'Category', type: 'select', required: true,
    options: [
      { value: 'incorporation', label: 'Incorporation' },
      { value: 'compliance', label: 'Compliance' },
      { value: 'tax', label: 'Tax' },
      { value: 'legal', label: 'Legal' },
      { value: 'hr', label: 'HR' },
      { value: 'accounting', label: 'Accounting' },
    ]
  },
  {
    key: 'serviceType', label: 'Service Type', type: 'select', required: true,
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'premium', label: 'Premium' },
      { value: 'enterprise', label: 'Enterprise' },
      { value: 'custom', label: 'Custom' },
    ]
  },
  { key: 'basePrice', label: 'Base Price (₹)', type: 'number', required: true, placeholder: '5000' },
  { key: 'slaHours', label: 'SLA Hours', type: 'number', required: true, placeholder: '48' },
  {
    key: 'complexityLevel', label: 'Complexity', type: 'select', required: true,
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'expert', label: 'Expert' },
    ]
  },
  { key: 'isActive', label: 'Active', type: 'boolean' },
];

// Task columns
const taskColumns: ColumnDefinition[] = [
  { key: 'title', label: 'Task Title', type: 'text', required: true, placeholder: 'Review GST filing' },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'Detailed task description' },
  {
    key: 'priority', label: 'Priority', type: 'select', required: true,
    options: [
      { value: 'low', label: 'Low' },
      { value: 'normal', label: 'Normal' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ]
  },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
  {
    key: 'category', label: 'Category', type: 'select', required: true,
    options: [
      { value: 'service', label: 'Service' },
      { value: 'compliance', label: 'Compliance' },
      { value: 'finance', label: 'Finance' },
      { value: 'support', label: 'Support' },
      { value: 'other', label: 'Other' },
    ]
  },
  { key: 'assigneeEmail', label: 'Assignee Email', type: 'email', placeholder: 'assignee@company.com' },
];

// Compliance columns
const complianceColumns: ColumnDefinition[] = [
  { key: 'entityName', label: 'Entity Name', type: 'text', required: true, placeholder: 'ABC Pvt Ltd' },
  {
    key: 'complianceType', label: 'Compliance Type', type: 'select', required: true,
    options: [
      { value: 'gst_return', label: 'GST Return' },
      { value: 'tds_return', label: 'TDS Return' },
      { value: 'income_tax', label: 'Income Tax' },
      { value: 'roc_filing', label: 'ROC Filing' },
      { value: 'esi_pf', label: 'ESI/PF' },
      { value: 'audit', label: 'Audit' },
      { value: 'other', label: 'Other' },
    ]
  },
  { key: 'dueDate', label: 'Due Date', type: 'date', required: true },
  {
    key: 'status', label: 'Status', type: 'select', required: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'overdue', label: 'Overdue' },
    ]
  },
  { key: 'penaltyAmount', label: 'Penalty Amount (₹)', type: 'number', placeholder: '0' },
  { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Additional notes' },
];

// Module configurations
const modules: BulkUploadModule[] = [
  {
    id: 'leads',
    name: 'Leads',
    description: 'Import potential clients and sales opportunities',
    icon: Users,
    color: 'bg-blue-500',
    columns: leadColumns,
    sampleData: [
      { companyName: 'Tech Solutions Pvt Ltd', contactPerson: 'Rahul Sharma', email: 'rahul@techsolutions.com', phone: '+919876543210', leadSource: 'website', requirementSummary: 'GST registration needed', estimatedValue: 15000, stage: 'new' },
      { companyName: 'Green Foods', contactPerson: 'Priya Patel', email: 'priya@greenfoods.in', phone: '+919123456789', leadSource: 'referral', requirementSummary: 'Company incorporation', estimatedValue: 35000, stage: 'hot' },
    ],
    endpoint: '/api/crm/leads/bulk',
  },
  {
    id: 'clients',
    name: 'Clients',
    description: 'Import existing clients and their details',
    icon: Building2,
    color: 'bg-green-500',
    columns: clientColumns,
    sampleData: [
      { name: 'ABC Enterprises', entityType: 'private_limited', email: 'info@abc.com', phone: '+919876543210', city: 'Mumbai', state: 'MH', industry: 'technology', pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5', relationshipManager: 'John Doe' },
    ],
    endpoint: '/api/clients/bulk',
  },
  {
    id: 'entities',
    name: 'Business Entities',
    description: 'Import business entities with compliance details',
    icon: Briefcase,
    color: 'bg-purple-500',
    columns: entityColumns,
    sampleData: [
      { name: 'XYZ Traders', entityType: 'partnership', pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5', city: 'Delhi', state: 'DL', industryType: 'retail' },
    ],
    endpoint: '/api/entities/bulk',
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Import service catalog definitions',
    icon: FileText,
    color: 'bg-orange-500',
    columns: serviceColumns,
    sampleData: [
      { serviceCode: 'GST-REG', name: 'GST Registration', description: 'New GST registration service', category: 'tax', serviceType: 'standard', basePrice: 2999, slaHours: 48, complexityLevel: 'low', isActive: true },
      { serviceCode: 'PVT-INC', name: 'Private Limited Incorporation', description: 'Register a new private limited company', category: 'incorporation', serviceType: 'premium', basePrice: 15999, slaHours: 120, complexityLevel: 'high', isActive: true },
    ],
    endpoint: '/api/services/bulk',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Import tasks and assignments',
    icon: CheckSquare,
    color: 'bg-yellow-500',
    columns: taskColumns,
    sampleData: [
      { title: 'Review GST filing for ABC Ltd', description: 'Check Q1 GST return accuracy', priority: 'high', dueDate: '2024-03-15', category: 'compliance', assigneeEmail: 'john@company.com' },
    ],
    endpoint: '/api/tasks/bulk',
  },
  {
    id: 'compliance',
    name: 'Compliance Items',
    description: 'Import compliance tracking items',
    icon: ClipboardCheck,
    color: 'bg-red-500',
    columns: complianceColumns,
    sampleData: [
      { entityName: 'ABC Pvt Ltd', complianceType: 'gst_return', dueDate: '2024-03-20', status: 'pending', notes: 'Q4 GST return filing' },
    ],
    endpoint: '/api/compliance/bulk',
  },
];

export default function BulkUploadCenter() {
  const [, setLocation] = useLocation();
  const [activeModule, setActiveModule] = useState<BulkUploadModule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generic bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: Record<string, any>[] }) => {
      const response = await apiRequest('POST', endpoint, { items: data });
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on module
      const moduleId = modules.find(m => m.endpoint === variables.endpoint)?.id;
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: [moduleId] });
        queryClient.invalidateQueries({ queryKey: ['crm'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['entities'] });
        queryClient.invalidateQueries({ queryKey: ['services'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['compliance'] });
      }
    },
  });

  // Handle upload for a module
  const handleUpload = async (data: Record<string, any>[]): Promise<BulkUploadResult> => {
    if (!activeModule) {
      return { success: 0, failed: data.length, errors: ['No module selected'] };
    }

    try {
      const result = await bulkUploadMutation.mutateAsync({
        endpoint: activeModule.endpoint,
        data,
      });

      return {
        success: result.success || data.length,
        failed: result.failed || 0,
        errors: result.errors || [],
        insertedIds: result.insertedIds,
      };
    } catch (error: any) {
      return {
        success: 0,
        failed: data.length,
        errors: [error.message || 'Upload failed'],
      };
    }
  };

  // Open dialog for a module
  const openModuleDialog = (module: BulkUploadModule) => {
    setActiveModule(module);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Center</h1>
          <p className="text-muted-foreground mt-1">
            Import data in bulk across all modules using Excel or CSV files
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation('/settings')}>
            <History className="h-4 w-4 mr-2" />
            Upload History
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {modules.map(module => (
          <Card key={module.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openModuleDialog(module)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${module.color} text-white`}>
                <module.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">{module.name}</p>
                <p className="text-xs text-muted-foreground">{module.columns.length} fields</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Cards */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Modules</TabsTrigger>
          <TabsTrigger value="sales">Sales & CRM</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(module => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${module.color} text-white`}>
                      <module.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline">{module.columns.filter(c => c.required).length} required</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Column preview */}
                    <div className="flex flex-wrap gap-1">
                      {module.columns.slice(0, 5).map(col => (
                        <Badge key={col.key} variant="secondary" className="text-xs">
                          {col.label}
                          {col.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Badge>
                      ))}
                      {module.columns.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{module.columns.length - 5} more
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        onClick={() => openModuleDialog(module)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModule(module);
                          // Trigger template download
                          const link = document.createElement('a');
                          // This will be handled by the dialog's download function
                          openModuleDialog(module);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.filter(m => ['leads', 'clients'].includes(m.id)).map(module => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${module.color} text-white`}>
                      <module.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline">{module.columns.filter(c => c.required).length} required</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openModuleDialog(module)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {module.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.filter(m => ['entities', 'services', 'tasks'].includes(m.id)).map(module => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${module.color} text-white`}>
                      <module.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline">{module.columns.filter(c => c.required).length} required</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openModuleDialog(module)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {module.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.filter(m => ['compliance'].includes(m.id)).map(module => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${module.color} text-white`}>
                      <module.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline">{module.columns.filter(c => c.required).length} required</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openModuleDialog(module)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {module.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            How to Use Bulk Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600 font-bold text-sm">1</div>
              <div>
                <h4 className="font-medium">Download Template</h4>
                <p className="text-sm text-muted-foreground">Get the Excel template with correct column headers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600 font-bold text-sm">2</div>
              <div>
                <h4 className="font-medium">Fill Your Data</h4>
                <p className="text-sm text-muted-foreground">Add your data following the template format</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600 font-bold text-sm">3</div>
              <div>
                <h4 className="font-medium">Preview & Edit</h4>
                <p className="text-sm text-muted-foreground">Review, fix errors, and edit data before saving</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600 font-bold text-sm">4</div>
              <div>
                <h4 className="font-medium">Upload</h4>
                <p className="text-sm text-muted-foreground">Save valid records to the database</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Upload Dialog */}
      {activeModule && (
        <BulkUploadDialogEnhanced
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={`Import ${activeModule.name}`}
          description={activeModule.description}
          columns={activeModule.columns}
          entityName={activeModule.name}
          onUpload={handleUpload}
          sampleData={activeModule.sampleData}
          allowManualEntry={true}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
