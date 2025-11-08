import { ChangeEvent, FormEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Mail, Phone, Plus, Search, Star, UserPlus } from 'lucide-react';

const LEAD_STAGES = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  hot_lead: { label: 'Hot', color: 'bg-red-100 text-red-800' },
  warm_lead: { label: 'Warm', color: 'bg-orange-100 text-orange-800' },
  cold_lead: { label: 'Cold', color: 'bg-gray-100 text-gray-800' },
  not_answered: { label: 'Not Answered', color: 'bg-yellow-100 text-yellow-800' },
  not_interested: { label: 'Not Interested', color: 'bg-purple-100 text-purple-800' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-800' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-800' },
} as const;

type LeadStageKey = keyof typeof LEAD_STAGES;
type LeadFilterStage = 'all' | LeadStageKey;

interface Lead {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  stage: LeadStageKey;
  requirementSummary?: string;
  leadSource?: string;
  estimatedValue?: number | string;
  isHot?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LeadStats {
  total: number;
  hotLeads: number;
  converted: number;
  conversionRate: number;
}

interface UpdateLeadInput {
  id: number;
  stage: LeadStageKey;
}

interface CreateLeadInput {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  leadSource: string;
  requirementSummary: string;
  estimatedValue: string;
  stage: LeadStageKey;
}

interface LeadCardProps {
  lead: Lead;
  onUpdate: (input: UpdateLeadInput) => void;
  onConvert: () => void;
}

interface CreateLeadFormProps {
  onSubmit: (data: CreateLeadInput) => void;
}

export default function LeadManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<LeadFilterStage>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads', filterStage],
  });

  const { data: leadStats } = useQuery<LeadStats>({
    queryKey: ['/api/leads/stats'],
  });

  const createLeadMutation = useMutation({
    mutationFn: (data: CreateLeadInput) => apiRequest<Lead>('POST', '/api/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/stats'] });
      toast({ title: "Success", description: "Lead created successfully" });
      setShowCreateModal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateLeadInput) => apiRequest<Lead>('PATCH', `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/stats'] });
      toast({ title: "Success", description: "Lead updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const convertLeadMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/leads/${id}/convert`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/stats'] });
      toast({
        title: "Success!",
        description: "Lead converted to client successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert lead",
        variant: "destructive",
      });
    },
  });

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    
    const matchesStage = filterStage === "all" || lead.stage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Lead Management</h1>
            <p className="text-muted-foreground">Track and convert your leads</p>
          </div>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-lead">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
                <DialogDescription>Enter lead information to start tracking</DialogDescription>
              </DialogHeader>
              <CreateLeadForm onSubmit={createLeadMutation.mutate} />
            </DialogContent>
          </Dialog>
        </div>

        {leadStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadStats.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{leadStats.hotLeads || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{leadStats.converted || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadStats.conversionRate || 0}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>All Leads</CardTitle>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    className="pl-8 w-full md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-leads"
                  />
                </div>
                <Select value={filterStage} onValueChange={(value) => setFilterStage(value as LeadFilterStage)}>
                  <SelectTrigger className="w-full md:w-48" data-testid="select-filter-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="hot_lead">Hot</SelectItem>
                    <SelectItem value="warm_lead">Warm</SelectItem>
                    <SelectItem value="cold_lead">Cold</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading leads...</div>
            ) : (
              <div className="space-y-4">
                {filteredLeads.map((lead: any) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onUpdate={updateLeadMutation.mutate}
                    onConvert={() => convertLeadMutation.mutate(lead.id)}
                  />
                ))}
                {filteredLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads found matching your criteria
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LeadCard({ lead, onUpdate, onConvert }: LeadCardProps) {
  const stageInfo = LEAD_STAGES[lead.stage] || LEAD_STAGES.new;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`lead-card-${lead.id}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{lead.companyName}</h3>
            <Badge className={stageInfo.color}>{stageInfo.label}</Badge>
            {lead.isHot && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              {lead.contactPerson}
            </div>
            {lead.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {lead.phone}
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {lead.email}
              </div>
            )}
          </div>

          {lead.requirementSummary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {lead.requirementSummary}
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Select value={lead.stage} onValueChange={(value) => onUpdate({ id: lead.id, stage: value as LeadStageKey })}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_STAGES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {lead.stage !== 'converted' && (
            <Button
              size="sm"
              onClick={onConvert}
              data-testid={`button-convert-${lead.id}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Convert
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateLeadForm({ onSubmit }: CreateLeadFormProps) {
  const [formData, setFormData] = useState<CreateLeadInput>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    leadSource: '',
    requirementSummary: '',
    estimatedValue: '',
    stage: 'new',
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof CreateLeadInput) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleRequirementChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, requirementSummary: event.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            required
            value={formData.companyName}
            onChange={handleInputChange('companyName')}
            data-testid="input-company-name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person *</Label>
          <Input
            id="contactPerson"
            required
            value={formData.contactPerson}
            onChange={handleInputChange('contactPerson')}
            data-testid="input-contact-person"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={handleInputChange('email')}
            data-testid="input-email"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleInputChange('phone')}
            data-testid="input-phone"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="leadSource">Lead Source</Label>
        <Select
          value={formData.leadSource}
          onValueChange={(value) => setFormData({ ...formData, leadSource: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="cold_call">Cold Call</SelectItem>
            <SelectItem value="social_media">Social Media</SelectItem>
            <SelectItem value="event">Event/Conference</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirementSummary">Requirement Summary</Label>
        <Textarea
          id="requirementSummary"
          value={formData.requirementSummary}
          onChange={handleRequirementChange}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedValue">Estimated Value (₹)</Label>
          <Input
            id="estimatedValue"
            type="number"
            value={formData.estimatedValue}
            onChange={handleInputChange('estimatedValue')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" data-testid="button-submit-lead">
          Create Lead
        </Button>
      </div>
    </form>
  );
}
