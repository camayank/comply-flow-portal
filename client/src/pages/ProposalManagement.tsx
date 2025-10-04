import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Send,
  Download,
  Edit,
  DollarSign,
  Calculator,
} from "lucide-react";

const PROPOSAL_STATUS = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Edit },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800", icon: Send },
  viewed: { label: "Viewed", color: "bg-purple-100 text-purple-800", icon: Eye },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-800", icon: Clock },
};

export default function ProposalManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['/api/proposals'],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
  });

  const { data: services = [] } = useQuery({
    queryKey: ['/api/services'],
  });

  const createProposalMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/proposals', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      toast({ title: "Success", description: "Proposal created successfully" });
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposal",
        variant: "destructive",
      });
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/proposals/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      toast({ title: "Success", description: "Proposal updated successfully" });
    },
  });

  const filteredProposals = proposals.filter((proposal: any) => {
    return (
      proposal.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.proposalId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Proposals</h1>
            <p className="text-muted-foreground">Create and manage client proposals</p>
          </div>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-proposal">
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
                <DialogDescription>Generate a proposal for your client</DialogDescription>
              </DialogHeader>
              <CreateProposalForm
                onSubmit={createProposalMutation.mutate}
                leads={leads}
                services={services}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposals.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {proposals.filter((p: any) => p.status === 'accepted').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {proposals.filter((p: any) => ['sent', 'viewed'].includes(p.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{proposals.reduce((sum: number, p: any) => sum + (parseFloat(p.totalAmount) || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Proposals</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-proposals"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading proposals...</div>
            ) : (
              <div className="space-y-4">
                {filteredProposals.map((proposal: any) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onClick={() => setSelectedProposal(proposal)}
                    onUpdate={updateProposalMutation.mutate}
                  />
                ))}
                {filteredProposals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No proposals found
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

function ProposalCard({ proposal, onClick, onUpdate }: any) {
  const statusConfig = PROPOSAL_STATUS[proposal.status as keyof typeof PROPOSAL_STATUS] || PROPOSAL_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      data-testid={`proposal-card-${proposal.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">{proposal.proposalId}</h3>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{proposal.companyName}</p>
          <p className="text-sm text-muted-foreground">{proposal.contactPerson}</p>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-primary">₹{parseFloat(proposal.totalAmount).toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">
            Valid until {new Date(proposal.validUntil).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ id: proposal.id, status: 'sent' });
          }}
        >
          <Send className="h-4 w-4 mr-1" />
          Send
        </Button>
        <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
          <Download className="h-4 w-4 mr-1" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}

function CreateProposalForm({ onSubmit, leads, services }: any) {
  const [formData, setFormData] = useState({
    leadId: "",
    companyName: "",
    contactPerson: "",
    email: "",
    selectedServices: [] as string[],
    discount: 0,
    validityDays: 30,
    notes: "",
    termsAndConditions: "Standard terms and conditions apply.",
  });

  const selectedServicesList = services.filter((s: any) => 
    formData.selectedServices.includes(s.serviceId)
  );

  const subtotal = selectedServicesList.reduce((sum: number, s: any) => sum + s.price, 0);
  const discountAmount = (subtotal * formData.discount) / 100;
  const total = subtotal - discountAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      totalAmount: total.toFixed(2),
      status: 'draft',
    });
  };

  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find((l: any) => l.id.toString() === leadId);
    if (lead) {
      setFormData({
        ...formData,
        leadId,
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        email: lead.email,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="leadId">Select Lead (Optional)</Label>
          <Select
            value={formData.leadId}
            onValueChange={handleLeadSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select from leads" />
            </SelectTrigger>
            <SelectContent>
              {leads.map((lead: any) => (
                <SelectItem key={lead.id} value={lead.id.toString()}>
                  {lead.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person *</Label>
          <Input
            id="contactPerson"
            required
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Select Services *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
          {services.slice(0, 20).map((service: any) => (
            <div key={service.serviceId} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={service.serviceId}
                checked={formData.selectedServices.includes(service.serviceId)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      selectedServices: [...formData.selectedServices, service.serviceId],
                    });
                  } else {
                    setFormData({
                      ...formData,
                      selectedServices: formData.selectedServices.filter(s => s !== service.serviceId),
                    });
                  }
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor={service.serviceId} className="text-sm cursor-pointer">
                {service.name} - ₹{service.price}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted p-4 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Discount:</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              className="w-20"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
            />
            <span>%</span>
            <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total:</span>
          <span className="text-primary">₹{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validityDays">Valid for (days)</Label>
          <Input
            id="validityDays"
            type="number"
            min="1"
            value={formData.validityDays}
            onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) || 30 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" data-testid="button-submit-proposal">
        <Calculator className="h-4 w-4 mr-2" />
        Create Proposal
      </Button>
    </form>
  );
}
