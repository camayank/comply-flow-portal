import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, X, FileText, Clock, DollarSign } from 'lucide-react';

const serviceConfigSchema = z.object({
  serviceName: z.string().min(3, 'Service name must be at least 3 characters'),
  serviceCode: z.string().min(2, 'Service code must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  serviceType: z.enum(['compliance', 'registration', 'consultation', 'filing', 'other']),
  periodicity: z.enum(['one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly']),
  basePrice: z.string().min(1, 'Base price is required'),
  estimatedDays: z.string().min(1, 'Estimated days is required'),
  requiredDocuments: z.array(z.string()).min(1, 'At least one document is required'),
  workflowSteps: z.array(z.string()).min(1, 'At least one workflow step is required'),
  isActive: z.boolean().default(true),
});

type ServiceConfigData = z.infer<typeof serviceConfigSchema>;

interface ServiceConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: any;
  mode: 'create' | 'edit';
}

const documentTypes = [
  'PAN Card', 'Aadhaar Card', 'Address Proof', 'Bank Statement',
  'GST Certificate', 'Incorporation Certificate', 'MOA/AOA',
  'Board Resolution', 'Director Details', 'Audited Financials',
  'ITR Copy', 'Sales Register', 'Purchase Register', 'Payroll Register'
];

const commonWorkflowSteps = [
  'Document Collection', 'Document Verification', 'Form Preparation',
  'Client Review', 'Government Filing', 'Acknowledgment Receipt',
  'Certificate Download', 'Client Delivery', 'Follow-up', 'Closure'
];

export function ServiceConfigForm({ open, onOpenChange, service, mode }: ServiceConfigFormProps) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(service?.requiredDocuments || []);
  const [selectedSteps, setSelectedSteps] = useState<string[]>(service?.workflowSteps || []);
  const [customDoc, setCustomDoc] = useState('');
  const [customStep, setCustomStep] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ServiceConfigData>({
    resolver: zodResolver(serviceConfigSchema),
    defaultValues: {
      serviceName: service?.serviceName || '',
      serviceCode: service?.serviceCode || '',
      description: service?.description || '',
      serviceType: service?.serviceType || 'compliance',
      periodicity: service?.periodicity || 'yearly',
      basePrice: service?.basePrice?.toString() || '',
      estimatedDays: service?.estimatedDays?.toString() || '',
      requiredDocuments: service?.requiredDocuments || [],
      workflowSteps: service?.workflowSteps || [],
      isActive: service?.isActive ?? true,
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceConfigData) => {
      const endpoint = mode === 'create' ? '/api/admin/services' : `/api/admin/services/${service.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      
      return apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          ...data,
          basePrice: parseFloat(data.basePrice),
          estimatedDays: parseInt(data.estimatedDays),
          requiredDocuments: selectedDocs,
          workflowSteps: selectedSteps,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      toast({
        title: mode === 'create' ? 'Service Created' : 'Service Updated',
        description: `${form.getValues('serviceName')} has been ${mode === 'create' ? 'created' : 'updated'} successfully.`,
      });
      onOpenChange(false);
      form.reset();
      setSelectedDocs([]);
      setSelectedSteps([]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${mode} service`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ServiceConfigData) => {
    if (selectedDocs.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one required document',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedSteps.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one workflow step',
        variant: 'destructive',
      });
      return;
    }

    createServiceMutation.mutate(data);
  };

  const addCustomDocument = () => {
    if (customDoc.trim() && !selectedDocs.includes(customDoc.trim())) {
      setSelectedDocs([...selectedDocs, customDoc.trim()]);
      setCustomDoc('');
    }
  };

  const addCustomStep = () => {
    if (customStep.trim() && !selectedSteps.includes(customStep.trim())) {
      setSelectedSteps([...selectedSteps, customStep.trim()]);
      setCustomStep('');
    }
  };

  const removeDocument = (doc: string) => {
    setSelectedDocs(selectedDocs.filter(d => d !== doc));
  };

  const removeStep = (step: string) => {
    setSelectedSteps(selectedSteps.filter(s => s !== step));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'create' ? 'Create New Service' : 'Edit Service'}
          </DialogTitle>
          <DialogDescription>
            Configure service details, requirements, and workflow processes
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., GST Registration" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., GST_REG" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="registration">Registration</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="filing">Filing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodicity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicity *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one_time">One Time</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="half_yearly">Half Yearly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (₹) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            type="number" 
                            placeholder="5000" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Days *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            type="number" 
                            placeholder="7" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of the service..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Required Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Required Documents</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {documentTypes.map((doc) => (
                  <Button
                    key={doc}
                    type="button"
                    variant={selectedDocs.includes(doc) ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      if (selectedDocs.includes(doc)) {
                        removeDocument(doc);
                      } else {
                        setSelectedDocs([...selectedDocs, doc]);
                      }
                    }}
                  >
                    <FileText className="h-3 w-3 mr-2" />
                    {doc}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom document..."
                  value={customDoc}
                  onChange={(e) => setCustomDoc(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomDocument())}
                />
                <Button type="button" onClick={addCustomDocument}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedDocs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDocs.map((doc) => (
                    <Badge key={doc} variant="secondary" className="text-xs">
                      {doc}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => removeDocument(doc)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Workflow Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Workflow Steps</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonWorkflowSteps.map((step) => (
                  <Button
                    key={step}
                    type="button"
                    variant={selectedSteps.includes(step) ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      if (selectedSteps.includes(step)) {
                        removeStep(step);
                      } else {
                        setSelectedSteps([...selectedSteps, step]);
                      }
                    }}
                  >
                    {step}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom workflow step..."
                  value={customStep}
                  onChange={(e) => setCustomStep(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomStep())}
                />
                <Button type="button" onClick={addCustomStep}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedSteps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSteps.map((step, index) => (
                    <Badge key={step} variant="secondary" className="text-xs">
                      {index + 1}. {step}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => removeStep(step)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createServiceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createServiceMutation.isPending ? 'Saving...' : mode === 'create' ? 'Create Service' : 'Update Service'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}