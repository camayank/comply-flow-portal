import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Calculator, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { type SalesProposal, type LeadEnhanced } from '@shared/schema';

const proposalFormSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  salesExecutive: z.string().min(1, 'Sales executive is required'),
  qualifiedLeadStatus: z.string().optional(),
  proposalStatus: z.string().min(1, 'Proposal status is required'),
  proposalAmount: z.string().min(1, 'Proposal amount is required'),
  requiredServices: z.array(z.object({
    name: z.string().min(1, 'Service name is required'),
    price: z.string().min(1, 'Service price is required'),
    description: z.string().optional()
  })).min(1, 'At least one service is required'),
  nextFollowupDate: z.date().optional(),
  finalRemark: z.string().optional(),
  documentsLink: z.string().optional(),
  paymentReceived: z.string().default('pending'),
  paymentPending: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalFormSchema>;

interface ProposalFormProps {
  initialData?: Partial<SalesProposal>;
  onSubmit: (data: ProposalFormData) => void;
  isLoading?: boolean;
  executives: string[];
  statuses: Array<{ value: string; label: string; color: string }>;
  qualifiedStatuses: string[];
  paymentStatuses: Array<{ value: string; label: string }>;
  selectedLead?: LeadEnhanced | null;
}

const DEFAULT_SERVICES = [
  { name: 'GST Registration', price: '5000', description: 'Complete GST registration process' },
  { name: 'Company Incorporation', price: '15000', description: 'Private Limited Company incorporation' },
  { name: 'ITR Filing', price: '2500', description: 'Individual Income Tax Return filing' },
  { name: 'Trademark Registration', price: '8000', description: 'Brand trademark registration' },
  { name: 'Annual Compliance', price: '25000', description: 'Annual ROC compliance package' },
  { name: 'GST Filing', price: '3000', description: 'Monthly GST return filing' },
  { name: 'TDS Returns', price: '2000', description: 'Quarterly TDS return filing' },
  { name: 'Accounting Services', price: '5000', description: 'Monthly accounting and bookkeeping' },
  { name: 'Legal Compliance', price: '15000', description: 'Legal documentation and compliance' },
  { name: 'Audit Services', price: '20000', description: 'Statutory audit services' }
];

export function ProposalForm({ 
  initialData, 
  onSubmit, 
  isLoading, 
  executives, 
  statuses, 
  qualifiedStatuses,
  paymentStatuses,
  selectedLead 
}: ProposalFormProps) {
  const [showServiceTemplates, setShowServiceTemplates] = useState(false);

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      leadId: initialData?.leadId || selectedLead?.leadId || '',
      salesExecutive: initialData?.salesExecutive || '',
      qualifiedLeadStatus: initialData?.qualifiedLeadStatus || '',
      proposalStatus: initialData?.proposalStatus || 'draft',
      proposalAmount: initialData?.proposalAmount?.toString() || '',
      requiredServices: (initialData?.requiredServices as any) || [{ name: '', price: '', description: '' }],
      nextFollowupDate: initialData?.nextFollowupDate ? new Date(initialData.nextFollowupDate) : undefined,
      finalRemark: initialData?.finalRemark || '',
      documentsLink: initialData?.documentsLink || '',
      paymentReceived: initialData?.paymentReceived || 'pending',
      paymentPending: initialData?.paymentPending?.toString() || '',
    }
  });

  const services = form.watch('requiredServices');

  const addService = () => {
    const currentServices = form.getValues('requiredServices');
    form.setValue('requiredServices', [...currentServices, { name: '', price: '', description: '' }]);
  };

  const removeService = (index: number) => {
    const currentServices = form.getValues('requiredServices');
    if (currentServices.length > 1) {
      form.setValue('requiredServices', currentServices.filter((_, i) => i !== index));
    }
  };

  const addServiceTemplate = (service: typeof DEFAULT_SERVICES[0]) => {
    const currentServices = form.getValues('requiredServices');
    // Check if service already exists
    const exists = currentServices.some(s => s.name === service.name);
    if (!exists) {
      form.setValue('requiredServices', [...currentServices, service]);
    }
    setShowServiceTemplates(false);
  };

  const calculateTotal = () => {
    const total = services.reduce((sum, service) => {
      const price = parseFloat(service.price) || 0;
      return sum + price;
    }, 0);
    form.setValue('proposalAmount', total.toString());
  };

  const handleSubmit = (data: ProposalFormData) => {
    const submitData = {
      ...data,
      proposalAmount: parseFloat(data.proposalAmount),
      paymentPending: data.paymentPending ? parseFloat(data.paymentPending) : 0,
    };
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="proposal-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lead ID */}
          <FormField
            control={form.control}
            name="leadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead ID *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter lead ID" 
                    {...field} 
                    data-testid="input-lead-id"
                    readOnly={!!selectedLead}
                    className={selectedLead ? 'bg-muted' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sales Executive */}
          <FormField
            control={form.control}
            name="salesExecutive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sales Executive *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-executive">
                      <SelectValue placeholder="Select executive" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {executives.map((executive) => (
                      <SelectItem key={executive} value={executive}>
                        {executive}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Qualified Lead Status */}
          <FormField
            control={form.control}
            name="qualifiedLeadStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qualified Lead Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-qualified-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {qualifiedStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Proposal Status */}
          <FormField
            control={form.control}
            name="proposalStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proposal Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-proposal-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Status */}
          <FormField
            control={form.control}
            name="paymentReceived"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-payment-status">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Pending */}
          <FormField
            control={form.control}
            name="paymentPending"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Pending (₹)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Enter pending amount" 
                    {...field} 
                    data-testid="input-payment-pending"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Required Services */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Required Services *</FormLabel>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowServiceTemplates(!showServiceTemplates)}
                data-testid="button-service-templates"
              >
                Service Templates
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addService}
                data-testid="button-add-service"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={calculateTotal}
                data-testid="button-calculate-total"
              >
                <Calculator className="h-4 w-4 mr-1" />
                Calculate Total
              </Button>
            </div>
          </div>

          {/* Service Templates */}
          {showServiceTemplates && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Service Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {DEFAULT_SERVICES.map((service, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="ghost"
                      className="justify-start h-auto p-3"
                      onClick={() => addServiceTemplate(service)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">₹{service.price}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services List */}
          <div className="space-y-3">
            {services.map((service, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`requiredServices.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter service name" 
                              {...field} 
                              data-testid={`input-service-name-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`requiredServices.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter price" 
                              {...field} 
                              data-testid={`input-service-price-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`requiredServices.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter description" 
                              {...field} 
                              data-testid={`input-service-description-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-end">
                      {services.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeService(index)}
                          data-testid={`button-remove-service-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Proposal Amount */}
        <FormField
          control={form.control}
          name="proposalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Proposal Amount (₹) *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Enter total amount" 
                  {...field} 
                  data-testid="input-proposal-amount"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Next Follow-up Date */}
        <FormField
          control={form.control}
          name="nextFollowupDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Follow-up Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      data-testid="button-followup-date"
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Documents Link */}
        <FormField
          control={form.control}
          name="documentsLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Documents Link</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter link to proposal documents" 
                  {...field} 
                  data-testid="input-documents-link"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Final Remark */}
        <FormField
          control={form.control}
          name="finalRemark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final Remark</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter any final remarks or notes" 
                  className="resize-none" 
                  {...field} 
                  data-testid="textarea-final-remark"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit-proposal">
            {isLoading ? 'Saving...' : (initialData ? 'Update Proposal' : 'Create Proposal')}
          </Button>
        </div>
      </form>
    </Form>
  );
}