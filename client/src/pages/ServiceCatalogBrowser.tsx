/**
 * SERVICE CATALOG BROWSER
 *
 * Browse all 96+ configurable services organized by category
 * - Search and filter services
 * - View service details and requirements
 * - Request service directly
 *
 * Accessible to: All users (public catalog)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  Tag,
  Calendar,
  IndianRupee,
  Briefcase,
  Shield,
  Scale,
  FileCheck,
  Calculator,
  Landmark,
  Globe,
  RefreshCw,
  Plus
} from "lucide-react";

// Category Icons
const CATEGORY_ICONS: Record<string, any> = {
  'Business Registration': Building2,
  'Taxation': Calculator,
  'Compliance & Regulatory': Shield,
  'Intellectual Property': Scale,
  'Legal & Documentation': FileText,
  'Accounting & Bookkeeping': FileCheck,
  'incorporation': Building2,
  'compliance': Shield,
  'accounting': Calculator,
  'annual': Calendar,
  'Other': Briefcase
};

// Service Card Component
function ServiceCard({
  service,
  onSelect
}: {
  service: any;
  onSelect: () => void;
}) {
  const Icon = CATEGORY_ICONS[service.category] || Briefcase;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                {service.name}
              </h3>
              <p className="text-xs text-muted-foreground">{service.category}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {service.periodicity || 'ONE_TIME'}
          </Badge>
        </div>

        {service.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {service.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {service.periodicity === 'ONE_TIME' ? 'One-time' :
             service.periodicity === 'MONTHLY' ? 'Monthly' :
             service.periodicity === 'QUARTERLY' ? 'Quarterly' :
             service.periodicity === 'ANNUAL' ? 'Annual' : service.periodicity}
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

// Service Detail Dialog
function ServiceDetailDialog({
  service,
  open,
  onClose,
  onRequest
}: {
  service: any;
  open: boolean;
  onClose: () => void;
  onRequest: () => void;
}) {
  const Icon = CATEGORY_ICONS[service?.category] || Briefcase;

  if (!service) return null;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <DialogTitle>{service.name}</DialogTitle>
            <DialogDescription>{service.category}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Frequency</p>
            <p className="font-medium text-sm">{service.periodicity || 'One-time'}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium text-sm">{service.isActive ? 'Available' : 'Unavailable'}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium text-sm">{service.category}</p>
          </div>
        </div>

        {/* Description */}
        {service.description && (
          <div>
            <h4 className="font-medium mb-2">About this Service</h4>
            <p className="text-sm text-muted-foreground">{service.description}</p>
          </div>
        )}

        {/* Service Key for reference */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Service Code:</span>
          <code className="text-sm font-mono">{service.serviceKey}</code>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onRequest}>
          <Plus className="h-4 w-4 mr-2" />
          Request This Service
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Request Service Dialog
function RequestServiceDialog({
  service,
  open,
  onClose,
  onSuccess
}: {
  service: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    period_label: '',
    due_date: '',
    priority: 'MEDIUM',
    description: ''
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/universal/client/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: user?.entityId,
          service_key: service?.serviceKey,
          ...data
        })
      });
      if (!res.ok) throw new Error('Failed to create request');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Service Requested",
        description: `Your ${service?.name} request has been submitted successfully.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/universal/client/dashboard'] });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit service request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    createRequestMutation.mutate(formData);
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request: {service.name}</DialogTitle>
          <DialogDescription>
            Fill in the details to request this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="period">Period/Reference</Label>
            <Input
              id="period"
              placeholder="e.g., FY 2024-25, Q1 2025"
              value={formData.period_label}
              onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Preferred Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) => setFormData({ ...formData, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Notes</Label>
            <Textarea
              id="description"
              placeholder="Any specific requirements or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
          >
            {createRequestMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function ServiceCatalogBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch service catalog
  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['/api/universal/services', { category: selectedCategory, search: searchQuery }]
  });

  const { services, byCategory, categories, total } = catalogData || {};

  // Filter services
  const filteredServices = (services || []).filter((service: any) => {
    const matchesSearch = !searchQuery ||
      service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.serviceKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || service.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setShowDetailDialog(true);
  };

  const handleRequestService = () => {
    setShowDetailDialog(false);
    setShowRequestDialog(true);
  };

  const handleRequestSuccess = () => {
    setShowRequestDialog(false);
    setSelectedService(null);
    setLocation('/my-services');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Service Catalog</h1>
        <p className="text-muted-foreground">
          Browse our comprehensive catalog of {total || 96}+ compliance and business services
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {(categories || []).map((cat: string) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {filteredServices.length} of {total || 0} services
      </div>

      {/* Services by Category */}
      {selectedCategory ? (
        // Show flat grid when category is selected
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service: any) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={() => handleServiceSelect(service)}
            />
          ))}
        </div>
      ) : (
        // Show accordion by category when no filter
        <Accordion type="multiple" className="space-y-4" defaultValue={categories?.slice(0, 3)}>
          {(categories || []).map((category: string) => {
            const categoryServices = filteredServices.filter((s: any) => s.category === category);
            if (categoryServices.length === 0) return null;

            const Icon = CATEGORY_ICONS[category] || Briefcase;

            return (
              <AccordionItem key={category} value={category} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold">{category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {categoryServices.length} services
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {categoryServices.map((service: any) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onSelect={() => handleServiceSelect(service)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* No Results */}
      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No services found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Service Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <ServiceDetailDialog
          service={selectedService}
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          onRequest={handleRequestService}
        />
      </Dialog>

      {/* Request Service Dialog */}
      <RequestServiceDialog
        service={selectedService}
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
