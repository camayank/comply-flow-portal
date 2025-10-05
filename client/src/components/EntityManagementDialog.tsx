import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Building2, Loader2 } from 'lucide-react';

interface EntityFormData {
  name: string;
  entityType: string;
  gstin: string;
  pan: string;
  cin: string;
  address: string;
  city: string;
  state: string;
  industryType: string;
}

interface EntityManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity?: any; // Existing entity for editing
  mode: 'add' | 'edit';
}

const ENTITY_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { value: 'private_limited', label: 'Private Limited Company' },
  { value: 'public_limited', label: 'Public Limited Company' },
  { value: 'opc', label: 'One Person Company (OPC)' },
];

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Puducherry'
];

const INDUSTRY_TYPES = [
  'Technology', 'Manufacturing', 'Retail', 'Healthcare', 'Education',
  'Finance', 'Real Estate', 'Hospitality', 'Consulting', 'E-commerce',
  'Food & Beverage', 'Agriculture', 'Construction', 'Other'
];

export function EntityManagementDialog({ open, onOpenChange, entity, mode }: EntityManagementDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<EntityFormData>({
    name: entity?.name || '',
    entityType: entity?.entityType || '',
    gstin: entity?.gstin || '',
    pan: entity?.pan || '',
    cin: entity?.cin || '',
    address: entity?.address || '',
    city: entity?.city || '',
    state: entity?.state || '',
    industryType: entity?.industryType || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EntityFormData, string>>>({});

  // Sync form data when entity or mode changes
  useEffect(() => {
    if (mode === 'edit' && entity) {
      setFormData({
        name: entity.name || '',
        entityType: entity.entityType || '',
        gstin: entity.gstin || '',
        pan: entity.pan || '',
        cin: entity.cin || '',
        address: entity.address || '',
        city: entity.city || '',
        state: entity.state || '',
        industryType: entity.industryType || '',
      });
    } else if (mode === 'add') {
      // Reset form for add mode
      setFormData({
        name: '',
        entityType: '',
        gstin: '',
        pan: '',
        cin: '',
        address: '',
        city: '',
        state: '',
        industryType: '',
      });
    }
    // Clear errors when mode/entity changes
    setErrors({});
  }, [entity, mode]);

  // Validation functions
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true; // GSTIN is optional
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  };

  const validateCIN = (cin: string): boolean => {
    if (!cin) return true; // CIN is optional
    const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
    return cinRegex.test(cin);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EntityFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required';
    }

    if (!formData.entityType) {
      newErrors.entityType = 'Entity type is required';
    }

    if (!formData.pan.trim()) {
      newErrors.pan = 'PAN is required';
    } else if (!validatePAN(formData.pan.toUpperCase())) {
      newErrors.pan = 'Invalid PAN format (e.g., AAACT1234A)';
    }

    if (formData.gstin && !validateGSTIN(formData.gstin.toUpperCase())) {
      newErrors.gstin = 'Invalid GSTIN format';
    }

    if (formData.cin && !validateCIN(formData.cin.toUpperCase())) {
      newErrors.cin = 'Invalid CIN format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create/Update entity mutation
  const saveMutation = useMutation({
    mutationFn: async (data: EntityFormData) => {
      const endpoint = mode === 'add' 
        ? '/api/client-master/clients'
        : `/api/client-master/clients/${entity.id}`;
      
      const method = mode === 'add' ? 'POST' : 'PATCH';
      
      // Transform data to match backend schema
      const payload = {
        ...data,
        pan: data.pan.toUpperCase(),
        gstin: data.gstin ? data.gstin.toUpperCase() : null,
        cin: data.cin ? data.cin.toUpperCase() : null,
        clientStatus: 'active',
        isActive: true,
      };

      return apiRequest(endpoint, method, payload);
    },
    onSuccess: () => {
      toast({
        title: mode === 'add' ? 'Entity Created!' : 'Entity Updated!',
        description: `Business entity has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/client/entities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-master/clients'] });
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        entityType: '',
        gstin: '',
        pan: '',
        cin: '',
        address: '',
        city: '',
        state: '',
        industryType: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${mode} entity`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      saveMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof EntityFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {mode === 'add' ? 'Add Business Entity' : 'Edit Business Entity'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Add a new business entity to manage its compliance and services'
              : 'Update your business entity information'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., TechCorp Private Limited"
                data-testid="input-entity-name"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityType">
                Entity Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.entityType}
                onValueChange={(value) => handleInputChange('entityType', value)}
              >
                <SelectTrigger id="entityType" data-testid="select-entity-type">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entityType && <p className="text-sm text-red-500">{errors.entityType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryType">Industry Type</Label>
              <Select
                value={formData.industryType}
                onValueChange={(value) => handleInputChange('industryType', value)}
              >
                <SelectTrigger id="industryType" data-testid="select-industry-type">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_TYPES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tax & Registration Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Tax & Registration Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pan">
                  PAN <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pan"
                  value={formData.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                  placeholder="AAACT1234A"
                  maxLength={10}
                  data-testid="input-pan"
                />
                {errors.pan && <p className="text-sm text-red-500">{errors.pan}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                  placeholder="27AAACT1234A1ZV"
                  maxLength={15}
                  data-testid="input-gstin"
                />
                {errors.gstin && <p className="text-sm text-red-500">{errors.gstin}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cin">CIN (Corporate Identification Number)</Label>
              <Input
                id="cin"
                value={formData.cin}
                onChange={(e) => handleInputChange('cin', e.target.value.toUpperCase())}
                placeholder="U12345MH2020PTC123456"
                maxLength={21}
                data-testid="input-cin"
              />
              {errors.cin && <p className="text-sm text-red-500">{errors.cin}</p>}
              <p className="text-xs text-muted-foreground">
                Required for Private/Public Limited Companies
              </p>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Address Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Complete business address"
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="e.g., Mumbai"
                  data-testid="input-city"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange('state', value)}
                >
                  <SelectTrigger id="state" data-testid="select-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-entity"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : mode === 'add' ? (
                'Add Entity'
              ) : (
                'Update Entity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
