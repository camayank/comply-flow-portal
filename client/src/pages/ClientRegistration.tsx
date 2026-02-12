import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building, User, FileText, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: 1, title: "Business Details", icon: Building },
  { id: 2, title: "Contact Information", icon: User },
  { id: 3, title: "KYC Documents", icon: FileText },
  { id: 4, title: "Services Selection", icon: CheckCircle2 },
];

export default function ClientRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Business Details
    businessName: "",
    entityType: "",
    pan: "",
    gstin: "",
    cin: "",
    industryType: "",
    registrationDate: "",
    
    // Contact Information
    fullName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    address: "",
    city: "",
    state: "",
    
    // KYC Documents (file references will be added after upload)
    panDocument: null as File | null,
    gstDocument: null as File | null,
    incorporationCertificate: null as File | null,
    
    // Services Selection
    selectedServices: [] as string[],
    
    // Terms
    agreedToTerms: false,
  });

  const registrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/client/register', data),
    onSuccess: (data) => {
      toast({
        title: "Registration Successful!",
        description: "Your account has been created. Please check your email for verification.",
      });
      const email = encodeURIComponent(formData.email);
      setLocation(`/login?registered=1&email=${email}`);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.businessName || !formData.entityType) {
          toast({ title: "Missing Fields", description: "Please fill all required fields", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.fullName || !formData.email || !formData.phone) {
          toast({ title: "Missing Fields", description: "Please fill all required fields", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        return true; // Documents are optional
      case 4:
        if (!formData.agreedToTerms) {
          toast({ title: "Terms Required", description: "Please accept the terms and conditions", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    registrationMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Register Your Business</h1>
          <p className="text-muted-foreground">Complete your registration in 4 simple steps</p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-4 gap-2 mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 p-2 rounded-lg ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : isCompleted
                      ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs text-center hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Enter your business name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    data-testid="input-business-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="entityType">Entity Type *</Label>
                  <Select
                    value={formData.entityType}
                    onValueChange={(value) => setFormData({ ...formData, entityType: value })}
                  >
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                      <SelectItem value="llp">LLP</SelectItem>
                      <SelectItem value="opc">One Person Company</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="proprietorship">Proprietorship</SelectItem>
                      <SelectItem value="public_limited">Public Limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input
                      id="pan"
                      placeholder="ABCDE1234F"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      maxLength={10}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      placeholder="22AAAAA0000A1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cin">CIN (if applicable)</Label>
                    <Input
                      id="cin"
                      placeholder="U12345MH2020PTC123456"
                      value={formData.cin}
                      onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="industryType">Industry Type</Label>
                    <Input
                      id="industryType"
                      placeholder="e.g., Technology, Manufacturing"
                      value={formData.industryType}
                      onChange={(e) => setFormData({ ...formData, industryType: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationDate">Registration Date</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    data-testid="input-full-name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="Maharashtra"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload your KYC documents (optional - you can upload these later)
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="panDocument">PAN Card</Label>
                  <Input
                    id="panDocument"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, panDocument: e.target.files?.[0] || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstDocument">GST Certificate</Label>
                  <Input
                    id="gstDocument"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, gstDocument: e.target.files?.[0] || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incorporationCertificate">Certificate of Incorporation</Label>
                  <Input
                    id="incorporationCertificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, incorporationCertificate: e.target.files?.[0] || null })}
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Review Your Information</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Business:</strong> {formData.businessName}</p>
                    <p><strong>Entity Type:</strong> {formData.entityType}</p>
                    <p><strong>Contact:</strong> {formData.fullName}</p>
                    <p><strong>Email:</strong> {formData.email}</p>
                    <p><strong>Phone:</strong> {formData.phone}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreedToTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
                    data-testid="checkbox-terms"
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    I agree to the Terms & Conditions and Privacy Policy. I understand that my information will be used for compliance management services.
                  </Label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || registrationMutation.isPending}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <Button
                type="button"
                onClick={handleNext}
                disabled={registrationMutation.isPending}
                data-testid="button-next"
              >
                {currentStep === STEPS.length ? (
                  registrationMutation.isPending ? "Submitting..." : "Complete Registration"
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
