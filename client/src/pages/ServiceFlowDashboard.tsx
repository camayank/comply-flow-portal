import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, PenTool, Building2, Receipt, Award, Users } from 'lucide-react';

const availableServices = [
  { id: 'aoc-4', name: 'AOC-4 Annual Filing', type: 'ROC', price: 1499, category: 'mandatory', deadline: '30 days', icon: FileText },
  { id: 'mgt-7', name: 'MGT-7 Annual Return', type: 'ROC', price: 1299, category: 'mandatory', deadline: '60 days', icon: Receipt },
  { id: 'gst-3b', name: 'GST-3B Monthly Return', type: 'Tax', price: 999, category: 'recurring', deadline: '20th of every month', icon: Receipt },
  { id: 'dpt-3', name: 'DPT-3 Deposit Return', type: 'ROC', price: 799, category: 'conditional', deadline: '30 days', icon: FileText },
  { id: 'ben-1', name: 'BEN-1 Beneficial Owner', type: 'ROC', price: 999, category: 'mandatory', deadline: '30 days', icon: Users },
  { id: 'iso-9001', name: 'ISO-9001 Certification', type: 'Certification', price: 4999, category: 'optional', deadline: 'No deadline', icon: Award },
  { id: 'inc-20a', name: 'INC-20A Commencement', type: 'ROC', price: 2999, category: 'mandatory', deadline: '180 days', icon: Building2 },
  { id: 'adt-1', name: 'ADT-1 Auditor Appointment', type: 'ROC', price: 1999, category: 'mandatory', deadline: '30 days', icon: Users }
];

const ServiceFlowDashboard = () => {
  const [, setLocation] = useLocation();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Select Service');
  const [activeTab, setActiveTab] = useState('all');
  const [currentStep, setCurrentStep] = useState(1);

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

  const handleServiceSelect = (svc: typeof availableServices[0]) => {
    if (!selectedServices.includes(svc.id)) {
      setSelectedServices([...selectedServices, svc.id]);
      setStatus('Document Checklist');
      setCurrentStep(2);
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
                                  <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
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
                            <service.icon className="h-5 w-5 text-blue-600" />
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

          {/* Document Checklist */}
          {status === 'Document Checklist' && (
            <Card>
              <CardHeader>
                <CardTitle>Document Upload Checklist</CardTitle>
                <CardDescription>
                  Upload the required documents for your selected services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedServiceData.map((service) => (
                  <div key={service.id} className="border p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <service.icon className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{service.name}</h3>
                      <Badge className={getCategoryColor(service.category)}>{service.category}</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Upload supporting documents for {service.name}:
                        </label>
                        <Input
                          type="file"
                          multiple
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocUpload(service.id, file);
                          }}
                          className="cursor-pointer"
                        />
                      </div>
                      
                      {uploadedDocs[service.id] && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Uploaded: {uploadedDocs[service.id]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={() => {
                    setStatus('Select Service');
                    setCurrentStep(1);
                  }}>
                    Back to Service Selection
                  </Button>
                  <Button onClick={handleProceed} disabled={Object.keys(uploadedDocs).length === 0}>
                    Submit & Proceed
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance In Progress */}
          {status === 'Compliance In Progress' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Clock className="h-16 w-16 text-yellow-500 mx-auto animate-spin" />
                  <h3 className="text-xl font-semibold">Processing Your Documents</h3>
                  <p className="text-gray-600">
                    Our compliance experts are reviewing your documents and preparing the necessary forms. 
                    This usually takes 2-4 hours.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-yellow-800">
                      You will receive an email notification once the documents are ready for e-signing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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