import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/layouts';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useCurrentUser } from '@/components/ProtectedRoute';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  Upload,
  CreditCard,
  CheckCircle,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Select Entity', icon: Building2 },
  { id: 2, title: 'Service Details', icon: FileText },
  { id: 3, title: 'Upload Documents', icon: Upload },
  { id: 4, title: 'Payment', icon: CreditCard },
];

export default function ServiceRequestCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    businessEntityId: '',
    priority: 'normal',
    notes: '',
    documents: [] as File[],
    documentType: 'general', // Default document type
  });

  // Load selected services from localStorage
  useEffect(() => {
    const storedServices = localStorage.getItem('selectedServices');
    if (storedServices) {
      const serviceIds = JSON.parse(storedServices);
      // Fetch service details for selected IDs
      // For now, using mock data
      setSelectedServices(serviceIds.map((id: string) => ({ id, name: `Service ${id}` })));
    } else {
      // No services selected, redirect back
      setLocation('/services');
    }
  }, [setLocation]);

  // Fetch client's business entities
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ['/api/client/entities'],
  });

  // Upload documents to a service request
  const uploadDocuments = async (serviceRequestId: number, files: File[]): Promise<boolean> => {
    if (files.length === 0) return true;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formDataObj = new FormData();

      // Add all files to FormData
      files.forEach((file) => {
        formDataObj.append('files', file);
      });

      // Add document type
      formDataObj.append('doctype', formData.documentType || 'general');

      // Add notes if present
      if (formData.notes) {
        formDataObj.append('notes', formData.notes);
      }

      const response = await fetch(`/api/files/service-requests/${serviceRequestId}/documents`, {
        method: 'POST',
        credentials: 'include',
        body: formDataObj,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload documents');
      }

      const result = await response.json();
      setUploadProgress(100);

      if (result.failed > 0) {
        toast({
          title: 'Some uploads failed',
          description: `${result.uploaded} file(s) uploaded, ${result.failed} failed`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Documents Uploaded',
          description: `${result.uploaded} file(s) uploaded successfully`,
        });
      }

      return result.success;
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload documents',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // Create service request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create service request
      const response = await apiRequest('POST', '/api/service-requests', data);
      return response;
    },
    onSuccess: async (data: any) => {
      const serviceRequestId = data.id;

      // If there are documents to upload, upload them
      if (formData.documents.length > 0 && serviceRequestId) {
        const uploadSuccess = await uploadDocuments(serviceRequestId, formData.documents);

        if (!uploadSuccess) {
          toast({
            title: 'Request Created',
            description: 'Service request created but some documents failed to upload. You can upload them later.',
          });
        } else {
          toast({
            title: 'Service Request Created!',
            description: 'Your service request and documents have been submitted successfully.',
          });
        }
      } else {
        toast({
          title: 'Service Request Created!',
          description: 'Your service request has been submitted successfully.',
        });
      }

      // Clear stored services
      localStorage.removeItem('selectedServices');

      // Redirect to payment if amount > 0, otherwise to portal
      if (data.totalAmount && data.totalAmount > 0) {
        setLocation(`/payment-gateway/${serviceRequestId}`);
      } else {
        setLocation(`/client-portal`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service request',
        variant: 'destructive',
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
    } else {
      setLocation('/services');
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.businessEntityId) {
          toast({
            title: 'Entity Required',
            description: 'Please select a business entity',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 2:
        // Service details are optional
        return true;
      case 3:
        // Documents are optional at this stage
        return true;
      case 4:
        // Payment validation
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    const requestData = {
      businessEntityId: parseInt(formData.businessEntityId),
      serviceId: selectedServices[0]?.id || 'unknown', // Use first service
      priority: formData.priority,
      notes: formData.notes,
      status: 'initiated',
    };

    createRequestMutation.mutate(requestData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Validate file types
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ];

      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      newFiles.forEach((file) => {
        if (allowedTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
          // Check file size (max 10MB)
          if (file.size <= 10 * 1024 * 1024) {
            validFiles.push(file);
          } else {
            invalidFiles.push(`${file.name} (too large - max 10MB)`);
          }
        } else {
          invalidFiles.push(`${file.name} (unsupported type)`);
        }
      });

      if (invalidFiles.length > 0) {
        toast({
          title: 'Some files rejected',
          description: invalidFiles.join(', '),
          variant: 'destructive',
        });
      }

      if (validFiles.length > 0) {
        setFormData((prev) => ({
          ...prev,
          documents: [...prev.documents, ...validFiles],
        }));
        toast({
          title: 'Files Added',
          description: `${validFiles.length} file(s) added`,
        });
      }

      // Reset input
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Service Request</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <Progress value={progress} className="mb-4" />
            <div className="flex justify-between">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      currentStep >= step.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <p className="text-xs text-center">{step.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Business Entity</CardTitle>
              <CardDescription>
                Choose which business this service request is for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entitiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading entities...</p>
                </div>
              ) : entities.length > 0 ? (
                <div className="space-y-3">
                  {(entities as any[]).map((entity: any) => (
                    <div
                      key={entity.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.businessEntityId === entity.id.toString()
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, businessEntityId: entity.id.toString() }))
                      }
                      data-testid={`entity-option-${entity.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{entity.name}</h3>
                          <p className="text-sm text-muted-foreground">{entity.entityType}</p>
                          <div className="mt-2 flex gap-4 text-xs">
                            {entity.gstin && (
                              <span className="text-muted-foreground">GSTIN: {entity.gstin}</span>
                            )}
                            {entity.pan && (
                              <span className="text-muted-foreground">PAN: {entity.pan}</span>
                            )}
                          </div>
                        </div>
                        {formData.businessEntityId === entity.id.toString() && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No entities found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please add a business entity first
                  </p>
                  <Button onClick={() => setLocation('/client-portal')}>
                    Go to Client Portal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>Provide additional information for your service request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selected Services</Label>
                <div className="mt-2 space-y-2">
                  {selectedServices.map((service, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-muted/50">
                      <p className="font-medium">{service.name || `Service ${service.id}`}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger id="priority" data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - No rush</SelectItem>
                    <SelectItem value="normal">Normal - Standard processing</SelectItem>
                    <SelectItem value="high">High - Need it soon</SelectItem>
                    <SelectItem value="urgent">Urgent - ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or additional information..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  data-testid="textarea-notes"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload required documents for your service request. Supported formats: PDF, Images (JPG, PNG), Word, Excel (max 10MB each)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Category</Label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, documentType: value }))}
                >
                  <SelectTrigger id="documentType" data-testid="select-document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Documents</SelectItem>
                    <SelectItem value="identity">Identity Documents (PAN, Aadhaar)</SelectItem>
                    <SelectItem value="incorporation">Incorporation Documents</SelectItem>
                    <SelectItem value="financial">Financial Documents</SelectItem>
                    <SelectItem value="tax">Tax Documents</SelectItem>
                    <SelectItem value="legal">Legal Documents</SelectItem>
                    <SelectItem value="compliance">Compliance Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload Area */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Upload Documents</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click to browse or drag and drop files here
                </p>
                <Input
                  id="file-upload-input"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv"
                  data-testid="input-file-upload"
                />
                <Button variant="outline" type="button" onClick={(e) => e.stopPropagation()}>
                  Browse Files
                </Button>
              </div>

              {/* File List */}
              {formData.documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({formData.documents.length})</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {formData.documents.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.size < 1024 * 1024
                                ? `${(file.size / 1024).toFixed(1)} KB`
                                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Info */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Document Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Maximum file size: 10MB per file</li>
                      <li>Up to 5 files can be uploaded at once</li>
                      <li>Ensure documents are clear and readable</li>
                      <li>You can also upload documents later from your dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>Review and complete payment for your service request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="space-y-2">
                  {selectedServices.map((service, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{service.name || `Service ${service.id}`}</span>
                      <span>₹2,999</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₹{(selectedServices.length * 2999).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Payment will be processed after submission
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Back to Services' : 'Previous'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={createRequestMutation.isPending}
            data-testid="button-next"
          >
            {createRequestMutation.isPending ? (
              'Submitting...'
            ) : currentStep === STEPS.length ? (
              'Submit Request'
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
