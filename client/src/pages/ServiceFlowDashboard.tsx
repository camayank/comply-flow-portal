import React, { useState, useEffect, type ComponentType } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, PenTool, Building2, Receipt, Award, Users, Camera, Eye, MessageSquare, Plus, Star, TrendingUp, Shield } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type IconComponent = ComponentType<{ className?: string }>;

interface ServiceDefinition {
  id: string;
  name: string;
  type: string;
  price: number;
  category: string;
  deadline?: string;
  formType?: string;
  icon?: IconComponent;
  requiredDocs?: string[];
}

type SelectableService = ServiceDefinition & { serviceId?: string };

interface AddOnDefinition {
  id: string;
  name: string;
  price: number;
  icon: IconComponent;
  urgency: string;
  description: string;
}

// KOSHIKA Services SOPs - configured from Excel worksheets
const koshikaServices: ServiceDefinition[] = [
  // Incorporation Services
  { id: 'company-incorporation', name: 'Company Incorporation', type: 'Incorporation', price: 15000, category: 'business-setup', deadline: '20 days', formType: 'SPICE Part B', icon: Building2, requiredDocs: ['unique_company_names', 'director_pan_aadhaar', 'address_proof', 'moa_aoa'] },
  { id: 'llp-incorporation', name: 'LLP Incorporation', type: 'Incorporation', price: 12000, category: 'business-setup', deadline: '3 months', formType: 'FiLLiP form', icon: Users, requiredDocs: ['unique_name', 'designated_partners', 'llp_agreement'] },
  { id: 'opc-incorporation', name: 'OPC Incorporation', type: 'Incorporation', price: 13000, category: 'business-setup', deadline: '20 days', formType: 'SPICE Part B', icon: Users, requiredDocs: ['unique_names', 'director_details', 'nominee_details'] },
  { id: 'section8-incorporation', name: 'Section 8 Company', type: 'Incorporation', price: 18000, category: 'business-setup', deadline: '20 days', formType: 'SPICE Part B', icon: Award, requiredDocs: ['charitable_objects', 'license_application'] },

  // Director Change Services
  { id: 'director-appointment', name: 'Director Appointment', type: 'Change', price: 4000, category: 'director-services', deadline: 'Within 1 month of board meeting', formType: 'DIR 12', icon: Users, requiredDocs: ['director_pan', 'aadhaar', 'board_resolution', 'consent_letter'] },
  { id: 'director-resignation', name: 'Director Resignation', type: 'Change', price: 3500, category: 'director-services', deadline: 'Within 1 month of board meeting', formType: 'DIR 11 and 12', icon: Users, requiredDocs: ['board_resolution', 'resignation_letter'] },

  // Annual Compliance Services
  { id: 'commencement-business', name: 'Commencement of Business', type: 'Compliance', price: 3000, category: 'annual-compliance', deadline: 'Within 180 days after incorporation', formType: 'INC 20A', icon: Building2, requiredDocs: ['director_declaration', 'office_verification'] },
  { id: 'auditor-appointment', name: 'Auditor Appointment', type: 'Compliance', price: 2500, category: 'annual-compliance', deadline: 'Within 15 days after appointment', formType: 'ADT 1', icon: Users, requiredDocs: ['auditor_consent', 'board_resolution'] },
  { id: 'director-kyc', name: 'Director KYC', type: 'Compliance', price: 2000, category: 'annual-compliance', deadline: 'Before 30th September every year', formType: 'DIR 3 KYC', icon: Users, requiredDocs: ['director_pan', 'aadhaar', 'address_proof'] },
  { id: 'aoc-4', name: 'AOC-4 Filing', type: 'Compliance', price: 5000, category: 'annual-compliance', deadline: 'Before 30th September every year', formType: 'AOC 4 Form', icon: FileText, requiredDocs: ['balance_sheet', 'pl_statement', 'auditor_report', 'board_resolution'] },
  { id: 'mgt-7a', name: 'MGT-7A Filing (Small Companies)', type: 'Compliance', price: 3500, category: 'annual-compliance', deadline: 'Before 30th September every year', formType: 'MGT 7A Form', icon: Receipt, requiredDocs: ['annual_return_draft', 'board_resolution'] },
  { id: 'mgt-7', name: 'MGT-7 Filing (Foundation)', type: 'Compliance', price: 4000, category: 'annual-compliance', deadline: 'Before 30th September every year', formType: 'MGT 7 Form', icon: Receipt, requiredDocs: ['annual_return', 'board_resolution', 'member_details'] },
  { id: 'dpt-3', name: 'DPT-3 Filing', type: 'Compliance', price: 3000, category: 'annual-compliance', deadline: '30th June every year', formType: 'DPT 3 Form', icon: FileText, requiredDocs: ['deposit_details', 'board_resolution'] },
  { id: 'itr-filing', name: 'ITR Filing (Companies)', type: 'Tax', price: 8000, category: 'tax-compliance', deadline: '31st October every year', formType: 'ITR 6 and 7', icon: Receipt, requiredDocs: ['financial_statements', 'tax_computation', 'audit_report'] },

  // LLP Annual Compliance
  { id: 'llp-form3', name: 'LLP Form-3 Filing', type: 'Compliance', price: 2500, category: 'llp-compliance', deadline: 'Within 1 month of LLP incorporation', formType: 'LLP Form 3', icon: FileText, requiredDocs: ['llp_agreement', 'partner_details'] },
  { id: 'llp-form11', name: 'LLP Form-11 Filing', type: 'Compliance', price: 4000, category: 'llp-compliance', deadline: '30th May every year', formType: 'LLP Form 11', icon: Receipt, requiredDocs: ['annual_accounts', 'llp_agreement'] },
  { id: 'llp-form8', name: 'LLP Form-8 Filing', type: 'Compliance', price: 5000, category: 'llp-compliance', deadline: '30th October every year', formType: 'LLP Form 8', icon: FileText, requiredDocs: ['statement_accounts', 'solvency_certificate'] },

  // Additional Change Services
  { id: 'company-address-change', name: 'Company Address Change', type: 'Change', price: 4500, category: 'company-changes', deadline: 'Within 1 month of board meeting', formType: 'INC 22', icon: Building2, requiredDocs: ['new_address_proof', 'board_resolution', 'noc_landlord'] },
  { id: 'llp-address-change', name: 'LLP Address Change', type: 'Change', price: 4000, category: 'llp-changes', deadline: 'Within 1 month of resolution', formType: 'Form 15 and Form 3', icon: Building2, requiredDocs: ['new_address_proof', 'partner_resolution'] },
  { id: 'llp-partner-change', name: 'LLP Partner Change', type: 'Change', price: 4500, category: 'llp-changes', deadline: 'Within 1 month of change', formType: 'Form 4 and 3', icon: Users, requiredDocs: ['new_partner_details', 'partner_agreement', 'consent_letter'] },

  // Conversion Services
  { id: 'pvt-to-opc-conversion', name: 'Private Limited to OPC Conversion', type: 'Conversion', price: 12000, category: 'conversion-services', deadline: '45 days', formType: 'Conversion Application', icon: Building2, requiredDocs: ['financial_statements', 'board_resolution', 'member_consent', 'compliance_certificate'] }
];

// Business-specific add-on recommendations
const businessAddOns: Record<string, AddOnDefinition[]> = {
  'ecommerce': [
    { id: 'gst-registration', name: 'GST Registration', price: 3000, icon: Receipt, urgency: 'high', description: 'Required for online sales' },
    { id: 'fssai-license', name: 'FSSAI License', price: 2500, icon: Shield, urgency: 'medium', description: 'For food products' },
    { id: 'trademark-filing', name: 'Trademark Registration', price: 8000, icon: Award, urgency: 'medium', description: 'Protect your brand' }
  ],
  'manufacturing': [
    { id: 'factory-license', name: 'Factory License', price: 5000, icon: Building2, urgency: 'high', description: 'Mandatory for manufacturing' },
    { id: 'pollution-clearance', name: 'Pollution Clearance', price: 4000, icon: Shield, urgency: 'high', description: 'Environmental compliance' },
    { id: 'gst-registration', name: 'GST Registration', price: 3000, icon: Receipt, urgency: 'high', description: 'Tax compliance' }
  ],
  'technology': [
    { id: 'startup-india', name: 'Startup India Registration', price: 2000, icon: Star, urgency: 'medium', description: 'Access government benefits' },
    { id: 'trademark-filing', name: 'Trademark Registration', price: 8000, icon: Award, urgency: 'high', description: 'Protect IP assets' },
    { id: 'copyright-filing', name: 'Copyright Registration', price: 3500, icon: FileText, urgency: 'medium', description: 'Protect software/content' }
  ],
  'consulting': [
    { id: 'professional-tax', name: 'Professional Tax Registration', price: 1500, icon: Receipt, urgency: 'medium', description: 'State-wise registration' },
    { id: 'gst-registration', name: 'GST Registration', price: 3000, icon: Receipt, urgency: 'high', description: 'Service tax compliance' }
  ]
};

const ServiceFlowDashboard = () => {
  const [, setLocation] = useLocation();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Select Service');
  const [activeTab, setActiveTab] = useState('all');
  const [currentStep, setCurrentStep] = useState(1);
  const [businessType, setBusinessType] = useState('technology'); // Default from user profile
  const [documentComments, setDocumentComments] = useState<Record<string, string>>({});
  const [taskUpdates, setTaskUpdates] = useState<any[]>([]);
  const [showAddOns, setShowAddOns] = useState(false);
  const { toast } = useToast();

  const steps = [
    'Select Service',
    'Document Checklist', 
    'Compliance In Progress',
    'Ready for E-Sign',
    'Payment & Completion'
  ];

  const getStepProgress = () => {
    return (currentStep / steps.length) * 100;
  };

  // Real-time task updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep > 2) {
        const updates = [
          { time: new Date(), message: 'Document verification completed', type: 'success' },
          { time: new Date(), message: 'Forms submitted to MCA portal', type: 'info' },
          { time: new Date(), message: 'Awaiting government approval', type: 'pending' }
        ];
        setTaskUpdates(prev => [...prev.slice(-2), updates[Math.floor(Math.random() * updates.length)]]);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [currentStep]);

  // Fetch services from backend
  const { data: backendServices = [], isLoading: servicesLoading } = useQuery<ServiceDefinition[]>({
    queryKey: ['/api/services'],
    enabled: true
  });

  // Use backend services if available, fallback to KOSHIKA config
  const availableServices: ServiceDefinition[] = backendServices.length > 0 ? backendServices : koshikaServices;

  // Service request creation mutation
  const createServiceRequestMutation = useMutation({
    mutationFn: async (serviceIds: string[]) => {
      return apiRequest('POST', '/api/service-requests', {
        serviceId: serviceIds.length === 1 ? serviceIds[0] : serviceIds,
        userId: 1, // Default user for demo
        status: 'initiated'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      setStatus('Document Checklist');
      setCurrentStep(2);
    }
  });

  const handleServiceSelect = (svc: SelectableService) => {
    if (!selectedServices.includes(svc.serviceId || svc.id)) {
      const newSelectedServices = [...selectedServices, svc.serviceId || svc.id];
      setSelectedServices(newSelectedServices);
      
      // Create service request in backend
      createServiceRequestMutation.mutate(newSelectedServices);
    }
  };

  const handleServiceRemove = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(id => id !== serviceId));
    if (selectedServices.length === 1) {
      setStatus('Select Service');
      setCurrentStep(1);
    }
  };

  const handleDocUpload = (serviceName: string, file: File) => {
    setUploadedDocs({ ...uploadedDocs, [serviceName]: file.name });
  };

  const handleProceed = () => {
    setStatus('Compliance In Progress');
    setCurrentStep(3);
    // Simulate preparation and review
    setTimeout(() => {
      setStatus('Ready for E-Sign');
      setCurrentStep(4);
    }, 2000);
  };

  const handleESign = () => {
    setStatus('Payment & Completion');
    setCurrentStep(5);
  };

  const handleComplete = () => {
    setLocation('/tracker');
  };

  const getServicesByCategory = (category: string) => {
    if (category === 'all') return availableServices;
    return availableServices.filter(service => service.category === category);
  };

  const selectedServiceData = availableServices.filter(service => 
    selectedServices.includes(service.id)
  );

  const totalAmount = selectedServiceData.reduce((sum, service) => sum + service.price, 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'mandatory': return 'bg-red-100 text-red-800';
      case 'recurring': return 'bg-blue-100 text-blue-800';
      case 'conditional': return 'bg-yellow-100 text-yellow-800';
      case 'optional': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'Select Service': return <FileText className="h-5 w-5" />;
      case 'Document Checklist': return <Upload className="h-5 w-5" />;
      case 'Compliance In Progress': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'Ready for E-Sign': return <PenTool className="h-5 w-5 text-blue-500" />;
      case 'Payment & Completion': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            DigiComply Service Workflow Portal
          </h1>
          <p className="text-lg text-gray-600">
            Complete any compliance service with our guided workflow
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Current Status: {status}
              </CardTitle>
              <span className="text-sm text-gray-600">Step {currentStep} of {steps.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={getStepProgress()} className="mb-4" />
            <div className="flex justify-between text-xs text-gray-600">
              {steps.map((step, index) => (
                <span key={step} className={index + 1 <= currentStep ? 'text-blue-600 font-medium' : ''}>
                  {step}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="max-w-6xl mx-auto">
          {/* Service Selection */}
          {status === 'Select Service' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Compliance Services</CardTitle>
                  <CardDescription>
                    Choose the services you need to complete. You can select multiple services to process together.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="all">All Services</TabsTrigger>
                      <TabsTrigger value="mandatory">Mandatory</TabsTrigger>
                      <TabsTrigger value="recurring">Recurring</TabsTrigger>
                      <TabsTrigger value="conditional">Conditional</TabsTrigger>
                      <TabsTrigger value="optional">Optional</TabsTrigger>
                    </TabsList>
                    <TabsContent value={activeTab} className="mt-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getServicesByCategory(activeTab).map((svc) => {
                          const Icon = svc.icon;
                          const isSelected = selectedServices.includes(svc.id);
                          
                          return (
                            <Card
                              key={svc.id}
                              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                              }`}
                              onClick={() => handleServiceSelect(svc)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  {Icon ? (
                                    <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                                  ) : null}
                                  <Badge className={getCategoryColor(svc.category)}>
                                    {svc.category}
                                  </Badge>
                                </div>
                                <CardTitle className="text-lg">{svc.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  Type: {svc.type} • Deadline: {svc.deadline}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between">
                                  <span className="text-2xl font-bold text-green-600">₹{svc.price.toLocaleString()}</span>
                                  {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Selected Services Summary */}
              {selectedServices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Services ({selectedServices.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedServiceData.map((service) => (
                        <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {service.icon && <service.icon className="h-5 w-5 text-blue-600" />}
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-gray-600">{service.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-green-600">₹{service.price.toLocaleString()}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleServiceRemove(service.id);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-3 flex items-center justify-between">
                        <span className="text-lg font-semibold">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Enhanced Document Checklist */}
          {status === 'Document Checklist' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Smart Document Capture
                  </CardTitle>
                  <CardDescription>
                    Upload documents with AI-powered verification and real-time quality checks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedServiceData.map(service => (
                    <div key={service.id} className="border p-6 rounded-lg bg-gradient-to-r from-white to-gray-50">
                      <div className="flex items-center gap-3 mb-6">
                        {service.icon && <service.icon className="h-6 w-6 text-blue-600" />}
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <Badge className={getCategoryColor(service.category)}>{service.category}</Badge>
                      </div>
                      
                      {/* Required Documents List */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Required Documents:</h4>
                        {service.requiredDocs?.map((doc: string, index: number) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium capitalize">
                                {doc.replace(/_/g, ' ')}
                              </span>
                              {uploadedDocs[`${service.id}-${doc}`] ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">Verified</span>
                                </div>
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                            
                            <div className="flex gap-3">
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleDocUpload(`${service.id}-${doc}`, file);
                                    toast({
                                      title: "Document uploaded",
                                      description: `${doc.replace(/_/g, ' ')} uploaded successfully`,
                                    });
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button variant="outline" size="sm">
                                <Camera className="h-4 w-4 mr-2" />
                                Scan
                              </Button>
                            </div>
                            
                            {/* Document Comments */}
                            <div className="mt-3">
                              <Textarea
                                placeholder="Add comments or special instructions for this document..."
                                value={documentComments[`${service.id}-${doc}`] || ''}
                                onChange={(e) => setDocumentComments(prev => ({
                                  ...prev,
                                  [`${service.id}-${doc}`]: e.target.value
                                }))}
                                className="text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Document Upload Progress */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Upload Progress</span>
                        <span className="text-sm text-gray-600">
                          {Object.keys(uploadedDocs).length} / {selectedServiceData.reduce((total, service) => total + (service.requiredDocs?.length ?? 0), 0)} documents
                        </span>
                      </div>
                      <Progress
                        value={(Object.keys(uploadedDocs).length / selectedServiceData.reduce((total, service) => total + (service.requiredDocs?.length ?? 0), 0)) * 100}
                        className="mb-3"
                      />
                      <p className="text-sm text-gray-600">
                        Upload all required documents to proceed to the next step
                      </p>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => {
                      setStatus('Select Service');
                      setCurrentStep(1);
                    }}>
                      Back to Service Selection
                    </Button>
                    <Button 
                      onClick={handleProceed} 
                      disabled={Object.keys(uploadedDocs).length === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Submit & Proceed
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Business-Specific Add-on Recommendations */}
              <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <Star className="h-5 w-5" />
                    Recommended Add-ons for {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Business
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    Complete your compliance setup with these industry-specific registrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                  {businessAddOns[businessType as keyof typeof businessAddOns]?.map(addon => (
                      <div key={addon.id} className="border border-amber-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <addon.icon className="h-5 w-5 text-amber-600" />
                            <div>
                              <h4 className="font-medium">{addon.name}</h4>
                              <p className="text-sm text-gray-600">{addon.description}</p>
                            </div>
                          </div>
                          <Badge variant={addon.urgency === 'high' ? 'destructive' : 'secondary'}>
                            {addon.urgency}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-green-600">₹{addon.price.toLocaleString()}</span>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Compliance In Progress with Real-time Tracking */}
          {status === 'Compliance In Progress' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Real-time Task Progress
                  </CardTitle>
                  <CardDescription>
                    Track your compliance workflow in real-time with detailed status updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedServiceData.map((service, index) => (
                    <div key={service.id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-3 mb-4">
                      {service.icon && <service.icon className="h-5 w-5 text-blue-600" />}
                        <h3 className="font-semibold">{service.name}</h3>
                        <Badge variant="secondary">In Progress</Badge>
                      </div>
                      
                      {/* Task Progress Steps */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-white rounded border-l-4 border-l-green-500">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">Document Verification</p>
                            <p className="text-xs text-gray-600">Completed • 2 min ago</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-white rounded border-l-4 border-l-blue-500">
                          <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">Form Preparation & Review</p>
                            <p className="text-xs text-gray-600">In Progress • Estimated 45 minutes</p>
                            <Progress value={65} className="mt-2 h-2" />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border-l-4 border-l-gray-300">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-600">Government Portal Submission</p>
                            <p className="text-xs text-gray-500">Pending • Awaiting form completion</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border-l-4 border-l-gray-300">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-600">Quality Assurance Check</p>
                            <p className="text-xs text-gray-500">Pending • Final review before e-signature</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Live Activity Feed */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <MessageSquare className="h-5 w-5" />
                    Live Activity Feed
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Real-time updates from our compliance team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {taskUpdates.map((update, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                        <div className={`h-2 w-2 rounded-full mt-2 ${
                          update.type === 'success' ? 'bg-green-500' : 
                          update.type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{update.message}</p>
                          <p className="text-xs text-gray-500">
                            {update.time.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {taskUpdates.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Activity updates will appear here as work progresses</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expert Contact & Support */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Users className="h-5 w-5" />
                    Your Compliance Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          CA
                        </div>
                        <div>
                          <p className="font-medium">CA Priya Sharma</p>
                          <p className="text-xs text-gray-600">Lead Compliance Expert</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Chat
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View Progress
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          CS
                        </div>
                        <div>
                          <p className="font-medium">CS Rahul Kumar</p>
                          <p className="text-xs text-gray-600">Document Specialist</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Chat
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Documents
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estimated Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Estimated Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Document Processing</span>
                      <span className="text-sm font-medium text-green-600">45 minutes remaining</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">2-4 hrs</p>
                        <p className="text-xs text-gray-600">Until E-signature Ready</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">7-14 days</p>
                        <p className="text-xs text-gray-600">Government Processing</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ready for E-Sign */}
          {status === 'Ready for E-Sign' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <PenTool className="h-16 w-16 text-blue-500 mx-auto" />
                  <h3 className="text-xl font-semibold text-green-700">Documents Ready for E-Signing</h3>
                  <p className="text-gray-600">
                    All forms have been prepared and reviewed. Please proceed with digital signing to finalize your compliance filings.
                  </p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-green-900">Documents Ready:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      {selectedServiceData.map((service) => (
                        <li key={service.id} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          {service.name} - Draft prepared
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button variant="outline">
                      Schedule Later
                    </Button>
                    <Button onClick={handleESign} className="bg-green-600 hover:bg-green-700">
                      E-Sign Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment & Completion */}
          {status === 'Payment & Completion' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-xl font-semibold text-green-700">E-Signing Complete!</h3>
                  <p className="text-gray-600">
                    Documents have been successfully signed. Complete the payment to finalize your service requests.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-left space-y-2">
                      <h4 className="font-medium text-blue-900">Payment Summary:</h4>
                      {selectedServiceData.map((service) => (
                        <div key={service.id} className="flex justify-between text-sm">
                          <span>{service.name}</span>
                          <span>₹{service.price.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total Amount:</span>
                        <span>₹{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={handleComplete}>
                      Pay Later
                    </Button>
                    <Button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700">
                      Pay ₹{totalAmount.toLocaleString()} & Complete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceFlowDashboard;