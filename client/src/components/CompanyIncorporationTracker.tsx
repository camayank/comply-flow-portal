import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Users, 
  Building2, 
  Calendar,
  ExternalLink,
  Shield,
  DollarSign,
  Upload
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IncorporationStep {
  id: string;
  name: string;
  description: string;
  requiredDocs: string[];
  estimatedDays: number;
  formType: string;
  dscRequirements?: string[];
  mcaPortalSteps?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'requires_attention';
  deadline?: string;
  notes?: string[];
}

const incorporationSteps: IncorporationStep[] = [
  {
    id: 'pre-incorporation-prep',
    name: 'Pre-Incorporation Documentation',
    description: 'Collect and prepare all required documents and details',
    requiredDocs: [
      'Minimum 2 unique company names',
      'Minimum 2 directors details',
      'Electricity/Gas/Telephone/Water bill (not older than 2 months)',
      'Company MOA objects',
      'Share capital information (Authorized + Paid Up)',
      'Shareholding percentage',
      'Director PAN cards',
      'Director Aadhaar cards',
      'Director passport photos',
      'Unique email IDs',
      'Unique phone numbers',
      'Latest bank statements as address proof',
      'NOC from property owner'
    ],
    estimatedDays: 2,
    formType: 'Documentation Phase',
    status: 'completed',
    notes: [
      'All documents must be signed by directors and property owner',
      'Prepare Word documents for DIR-2 and company incorporation'
    ]
  },
  {
    id: 'name-reservation',
    name: 'Company Name Reservation (SPICE Part A)',
    description: 'Reserve unique company name through MCA portal',
    requiredDocs: [
      'Minimum 2 unique names',
      'MOA draft objects'
    ],
    estimatedDays: 5,
    formType: 'SPICE+ Part A',
    status: 'in_progress',
    deadline: 'Response from MCA in 3-7 days',
    mcaPortalSteps: [
      'Login to MCA portal (mca.gov.in)',
      'Go to Company E-Filing → Incorporation Services',
      'Select SPICE+ form for company name reservation',
      'Select: New company → Private → Limited by share → Non Govt. company',
      'Enter proposed names and MOA objects',
      'Make payment of ₹1,000'
    ],
    notes: [
      'DSC can be applied after name approval',
      'Must proceed with incorporation within 20 days of approval'
    ]
  },
  {
    id: 'dsc-application',
    name: 'Digital Signature Certificate Application',
    description: 'Apply for DSC certificates for directors and professionals',
    requiredDocs: [
      'Director PAN cards',
      'Director Aadhaar cards', 
      'Director photos',
      'Professional details'
    ],
    estimatedDays: 3,
    formType: 'DSC Application',
    status: 'pending',
    dscRequirements: ['All directors', 'All shareholders', 'Professional'],
    notes: [
      'Apply after name approval',
      'DSC must be associated on V3 portal'
    ]
  },
  {
    id: 'spice-part-b-filing',
    name: 'SPICE Part B Filing',
    description: 'File main incorporation form with company details',
    requiredDocs: [
      'Approved company name',
      'Director and shareholder details',
      'Registered office address',
      'PAN/TAN area codes'
    ],
    estimatedDays: 1,
    formType: 'SPICE+ Part B',
    status: 'pending',
    dscRequirements: ['One director DSC', 'Professional DSC'],
    mcaPortalSteps: [
      'Login with professional credentials',
      'Search approved company name',
      'Fill company address and director details',
      'Get PAN/TAN area codes from NSDL links'
    ]
  },
  {
    id: 'agilepro-filing',
    name: 'Agilepro Form Filing',
    description: 'File business activity and compliance declarations',
    requiredDocs: [
      'Business place details (rented/owned)',
      'Company activity details',
      'ESIC/PF declarations',
      'Bank information'
    ],
    estimatedDays: 1,
    formType: 'Agilepro',
    status: 'pending',
    dscRequirements: ['Director DSC only']
  },
  {
    id: 'aoa-filing',
    name: 'Articles of Association Filing',
    description: 'File company articles with governance structure',
    requiredDocs: [
      'Company governance details',
      'Board structure',
      'Articles alterations'
    ],
    estimatedDays: 1,
    formType: 'AOA',
    status: 'pending',
    dscRequirements: ['All directors DSC', 'All shareholders DSC', 'Professional DSC']
  },
  {
    id: 'moa-filing',
    name: 'Memorandum of Association Filing',
    description: 'File company memorandum with objects and shareholding',
    requiredDocs: [
      'Company main objects',
      'Other specified objects',
      'Shareholder details',
      'Share capital structure'
    ],
    estimatedDays: 1,
    formType: 'MOA',
    status: 'pending',
    dscRequirements: ['All directors DSC', 'All shareholders DSC', 'Professional DSC']
  },
  {
    id: 'inc9-filing',
    name: 'INC-9 Form Filing',
    description: 'File subscriber and director declarations',
    requiredDocs: [
      'Director declarations',
      'Subscriber details'
    ],
    estimatedDays: 1,
    formType: 'Form INC-9',
    status: 'pending',
    dscRequirements: ['All directors DSC', 'All shareholders DSC']
  },
  {
    id: 'form-upload-payment',
    name: 'Form Upload and Payment',
    description: 'Upload all forms to MCA V3 portal and make payment',
    requiredDocs: [
      'All completed forms with DSC',
      'Payment confirmation'
    ],
    estimatedDays: 1,
    formType: 'MCA V3 Portal Upload',
    status: 'pending'
  },
  {
    id: 'incorporation-completion',
    name: 'Certificate of Incorporation',
    description: 'Receive Certificate of Incorporation from MCA',
    requiredDocs: [],
    estimatedDays: 7,
    formType: 'MCA Processing',
    status: 'pending',
    deadline: 'Certificate issued in 5-7 days'
  }
];

const CompanyIncorporationTracker: React.FC = () => {
  const [activeStep, setActiveStep] = useState('name-reservation');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'requires_attention': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'requires_attention': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const completedSteps = incorporationSteps.filter(step => step.status === 'completed').length;
  const totalSteps = incorporationSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const formatDocs = (docs: string[]) => {
    return docs.map(doc => doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Company Incorporation Tracker
        </h1>
        <p className="text-lg text-gray-600">
          Complete SPICE Part A/B, Agilepro, MOA/AOA, INC-9 workflow with DSC requirements
        </p>
        
        {/* Progress Overview */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold">Overall Progress</span>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {completedSteps} of {totalSteps} completed
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2 mb-2" />
          <div className="text-sm text-gray-600">
            {progressPercentage.toFixed(0)}% complete
          </div>
        </div>
      </div>

      {/* Critical Deadlines Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Critical Deadline:</strong> All incorporation processes must be completed within 20 days of name approval. 
          Address proof documents must not be older than 2 months.
        </AlertDescription>
      </Alert>

      {/* Steps List */}
      <div className="space-y-4">
        {incorporationSteps.map((step, index) => (
          <Card key={step.id} className={`transition-all duration-200 ${
            step.status === 'in_progress' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{step.name}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getStatusColor(step.status)}>
                    {step.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {getStatusIcon(step.status)}
                </div>
              </div>
              
              {/* Quick Info */}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {step.formType}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {step.estimatedDays} day{step.estimatedDays > 1 ? 's' : ''}
                </div>
                {step.dscRequirements && (
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    DSC Required
                  </div>
                )}
              </div>
            </CardHeader>

            {expandedStep === step.id && (
              <CardContent className="pt-0">
                <Tabs defaultValue="documents" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="dsc">DSC Requirements</TabsTrigger>
                    <TabsTrigger value="portal">MCA Portal Steps</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="documents" className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Required Documents:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {formatDocs(step.requiredDocs).map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="dsc" className="space-y-3">
                    <h4 className="font-semibold text-gray-900">DSC Affixing Requirements:</h4>
                    {step.dscRequirements ? (
                      <div className="space-y-2">
                        {step.dscRequirements.map((req, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{req}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">No DSC requirements for this step</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="portal" className="space-y-3">
                    <h4 className="font-semibold text-gray-900">MCA Portal Steps:</h4>
                    {step.mcaPortalSteps ? (
                      <ol className="space-y-2">
                        {step.mcaPortalSteps.map((portalStep, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{portalStep}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-gray-600 text-sm">No specific portal steps documented</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="notes" className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Important Notes:</h4>
                    {step.notes ? (
                      <div className="space-y-2">
                        {step.notes.map((note, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{note}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">No additional notes</p>
                    )}
                    
                    {step.deadline && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                        <Calendar className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Deadline: {step.deadline}</span>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    size="sm" 
                    variant={step.status === 'completed' ? 'outline' : 'default'}
                    disabled={step.status === 'completed'}
                  >
                    {step.status === 'completed' ? 'Completed' : 'Mark Complete'}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                  {step.mcaPortalSteps && (
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open MCA Portal
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Incorporation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">₹15,000</div>
              <div className="text-sm text-gray-600">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">20 days</div>
              <div className="text-sm text-gray-600">Max Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">10</div>
              <div className="text-sm text-gray-600">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">5</div>
              <div className="text-sm text-gray-600">Forms Required</div>
            </div>
          </div>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Upon completion, you'll receive your Certificate of Incorporation and can proceed with 
              bank account opening and post-incorporation compliance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyIncorporationTracker;