/**
 * Agent KYC Document Management Page
 *
 * Comprehensive KYC verification management for agents including:
 * - KYC status overview and progress tracking
 * - Document upload and management
 * - Verification status tracking
 * - Rejection handling and resubmission
 * - Document requirements and guidelines
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  FileText,
  AlertTriangle,
  Info,
  Download,
  Trash2,
  RefreshCw,
  Shield,
  Star,
  Gift,
  ChevronRight,
  Eye,
  HelpCircle,
  FileCheck,
  FileX,
  FileQuestion,
  Loader2,
  Calendar,
  User,
  Building,
  CreditCard,
  Camera,
  Award,
  Zap,
} from "lucide-react";

// Types
interface KycDocument {
  id: number;
  documentType: string;
  documentName: string;
  fileName: string;
  originalFileName?: string;
  fileSize: number;
  mimeType?: string;
  uploadedAt: string;
  status: 'verified' | 'pending_review' | 'rejected' | 'not_uploaded';
  verifiedBy: string | null;
  verifiedAt: string | null;
  extractedData: Record<string, any> | null;
  rejectionReason: string | null;
  version: number;
  downloadUrl?: string;
}

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  status: string;
  uploadedFile: {
    id: number;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    extractedData: Record<string, any> | null;
    rejectionReason: string | null;
  } | null;
}

interface KycStatus {
  agentId: number;
  overallStatus: 'not_started' | 'incomplete' | 'pending_verification' | 'verified' | 'action_required';
  statusMessage: string;
  completionPercentage: number;
  statistics: {
    totalRequired: number;
    uploaded: number;
    verified: number;
    pending: number;
    rejected: number;
    missing: number;
  };
  requiredDocuments: RequiredDocument[];
  uploadedDocuments: KycDocument[];
  timeline: {
    date: string;
    event: string;
    status: string;
  }[];
  benefits: {
    currentTier: string;
    unlockedFeatures: string[];
    pendingFeatures: string[];
  };
  nextSteps: string[];
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    verified: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" />, label: "Verified" },
    pending_review: { variant: "secondary", icon: <Clock className="h-3 w-3" />, label: "Pending Review" },
    rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Rejected" },
    not_uploaded: { variant: "outline", icon: <FileQuestion className="h-3 w-3" />, label: "Not Uploaded" },
  };

  const config = variants[status] || variants.not_uploaded;

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
};

// Overall status card
const KycStatusCard = ({ status }: { status: KycStatus }) => {
  const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
    not_started: { color: "text-gray-600", bgColor: "bg-gray-50", icon: <FileQuestion className="h-8 w-8" /> },
    incomplete: { color: "text-amber-600", bgColor: "bg-amber-50", icon: <AlertTriangle className="h-8 w-8" /> },
    pending_verification: { color: "text-blue-600", bgColor: "bg-blue-50", icon: <Clock className="h-8 w-8" /> },
    verified: { color: "text-green-600", bgColor: "bg-green-50", icon: <Shield className="h-8 w-8" /> },
    action_required: { color: "text-red-600", bgColor: "bg-red-50", icon: <AlertTriangle className="h-8 w-8" /> },
  };

  const config = statusConfig[status.overallStatus] || statusConfig.incomplete;

  return (
    <Card className={`${config.bgColor} border-none`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={config.color}>{config.icon}</div>
              <div>
                <h3 className={`text-lg font-semibold ${config.color}`}>
                  KYC {status.overallStatus === 'verified' ? 'Verified' :
                       status.overallStatus === 'pending_verification' ? 'Under Review' :
                       status.overallStatus === 'action_required' ? 'Action Required' :
                       status.overallStatus === 'incomplete' ? 'Incomplete' : 'Not Started'}
                </h3>
                <p className="text-sm text-muted-foreground">{status.statusMessage}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Completion</span>
                <span className="font-medium">{status.completionPercentage}%</span>
              </div>
              <Progress value={status.completionPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{status.statistics.verified}</div>
                <div className="text-xs text-muted-foreground">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{status.statistics.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{status.statistics.rejected}</div>
                <div className="text-xs text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{status.statistics.missing}</div>
                <div className="text-xs text-muted-foreground">Missing</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Document card component
const DocumentCard = ({
  document,
  required,
  onUpload,
  onReupload,
  onDownload,
  onDelete,
}: {
  document: RequiredDocument;
  required: boolean;
  onUpload: (type: string) => void;
  onReupload: (docId: number, type: string) => void;
  onDownload: (docId: number) => void;
  onDelete: (docId: number) => void;
}) => {
  const getDocumentIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      pan_card: <CreditCard className="h-5 w-5" />,
      aadhaar: <User className="h-5 w-5" />,
      address_proof: <Building className="h-5 w-5" />,
      bank_details: <CreditCard className="h-5 w-5" />,
      photo: <Camera className="h-5 w-5" />,
      gst_certificate: <FileText className="h-5 w-5" />,
      professional_cert: <Award className="h-5 w-5" />,
      experience_letter: <FileText className="h-5 w-5" />,
    };
    return icons[type] || <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className={`${document.status === 'rejected' ? 'border-red-200 bg-red-50/30' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              document.status === 'verified' ? 'bg-green-100 text-green-600' :
              document.status === 'pending_review' ? 'bg-blue-100 text-blue-600' :
              document.status === 'rejected' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {getDocumentIcon(document.id)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{document.name}</h4>
                {required && <Badge variant="outline" className="text-xs">Required</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{document.description}</p>

              {document.uploadedFile && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>{document.uploadedFile.fileName}</span>
                    <span>({formatFileSize(document.uploadedFile.fileSize)})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>Uploaded: {new Date(document.uploadedFile.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {document.status === 'rejected' && document.uploadedFile?.rejectionReason && (
                <Alert variant="destructive" className="mt-2 py-2">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    {document.uploadedFile.rejectionReason}
                  </AlertDescription>
                </Alert>
              )}

              {document.uploadedFile?.extractedData && document.status === 'verified' && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                  <div className="font-medium text-green-700 mb-1">Verified Data:</div>
                  {Object.entries(document.uploadedFile.extractedData).map(([key, value]) => (
                    <div key={key} className="text-green-600">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <StatusBadge status={document.status} />

            <div className="flex gap-1 mt-2">
              {document.status === 'not_uploaded' && (
                <Button size="sm" onClick={() => onUpload(document.id)}>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              )}

              {document.status === 'rejected' && document.uploadedFile && (
                <Button size="sm" variant="destructive" onClick={() => onReupload(document.uploadedFile!.id, document.id)}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-upload
                </Button>
              )}

              {document.uploadedFile && document.status !== 'rejected' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onDownload(document.uploadedFile!.id)}>
                    <Download className="h-3 w-3" />
                  </Button>
                  {document.status === 'pending_review' && (
                    <Button size="sm" variant="ghost" onClick={() => onDelete(document.uploadedFile!.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Benefits card
const BenefitsCard = ({ benefits }: { benefits: KycStatus['benefits'] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4 text-purple-500" />
          KYC Benefits
        </CardTitle>
        <CardDescription>
          Current Tier: <Badge variant={benefits.currentTier === 'verified' ? 'default' : 'secondary'}>
            {benefits.currentTier === 'verified' ? 'Verified Partner' : 'Basic Partner'}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {benefits.unlockedFeatures.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Unlocked Features
            </h4>
            <ul className="space-y-1">
              {benefits.unlockedFeatures.map((feature, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {benefits.pendingFeatures.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Complete KYC to Unlock
            </h4>
            <ul className="space-y-1 opacity-60">
              {benefits.pendingFeatures.map((feature, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Timeline component
const KycTimeline = ({ timeline }: { timeline: KycStatus['timeline'] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Verification Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px]">
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className={`mt-1 h-2 w-2 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'pending' ? 'bg-blue-500' :
                  item.status === 'action_required' ? 'bg-red-500' :
                  'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.event}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Upload dialog
const UploadDialog = ({
  open,
  onOpenChange,
  documentType,
  onUpload,
  isUploading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  onUpload: (file: File) => void;
  isUploading: boolean;
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const documentNames: Record<string, string> = {
    pan_card: 'PAN Card',
    aadhaar: 'Aadhaar Card',
    address_proof: 'Address Proof',
    bank_details: 'Bank Account Proof',
    photo: 'Passport Photo',
    gst_certificate: 'GST Certificate',
    professional_cert: 'Professional Certificate',
    experience_letter: 'Experience Letter',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload {documentNames[documentType] || 'Document'}</DialogTitle>
          <DialogDescription>
            Upload a clear, legible copy of your document for verification.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <FileCheck className="h-12 w-12 mx-auto text-green-500" />
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your file here, or click to browse
              </p>
              <Input
                type="file"
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleChange}
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </Label>
            </div>
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Accepted formats: PDF, JPG, PNG. Maximum file size: 5MB.
            Ensure all text is clearly readable.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main component
export default function AgentKYC() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');

  // Fetch KYC status
  const { data: kycStatus, isLoading: isLoadingStatus } = useQuery<KycStatus>({
    queryKey: ['/api/agent/kyc/status'],
  });

  // Fetch requirements
  const { data: requirements } = useQuery({
    queryKey: ['/api/agent/kyc/requirements'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('fileName', file.name);
      formData.append('fileSize', String(file.size));
      formData.append('mimeType', file.type);

      const response = await fetch('/api/agent/kyc/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been submitted for verification.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/kyc/status'] });
      setUploadDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = (type: string) => {
    setSelectedDocumentType(type);
    setUploadDialogOpen(true);
  };

  const handleFileUpload = (file: File) => {
    uploadMutation.mutate({ file, documentType: selectedDocumentType });
  };

  const handleDownload = (docId: number) => {
    toast({
      title: "Download Started",
      description: "Your document download will begin shortly.",
    });
  };

  const handleDelete = (docId: number) => {
    toast({
      title: "Document Deleted",
      description: "The document has been removed.",
    });
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kycStatus) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load KYC status. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">KYC Verification</h1>
        <p className="text-muted-foreground">
          Complete your KYC verification to unlock all agent features and benefits.
        </p>
      </div>

      {/* Status Card */}
      <KycStatusCard status={kycStatus} />

      {/* Next Steps Alert */}
      {kycStatus.nextSteps.length > 0 && kycStatus.overallStatus !== 'verified' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Next Steps</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {kycStatus.nextSteps.map((step, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  {step}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documents Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Required Documents</h3>
                <Badge variant="outline">
                  {kycStatus.statistics.verified}/{kycStatus.statistics.totalRequired} Verified
                </Badge>
              </div>

              <div className="space-y-3">
                {kycStatus.requiredDocuments
                  .filter(doc => doc.mandatory)
                  .map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      required={true}
                      onUpload={handleUpload}
                      onReupload={(docId, type) => handleUpload(type)}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>

              <Separator className="my-6" />

              <div className="flex items-center justify-between">
                <h3 className="font-medium">Optional Documents</h3>
                <Badge variant="secondary">Additional Benefits</Badge>
              </div>

              <div className="space-y-3">
                {kycStatus.requiredDocuments
                  .filter(doc => !doc.mandatory)
                  .map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      required={false}
                      onUpload={handleUpload}
                      onReupload={(docId, type) => handleUpload(type)}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Document Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>All documents should be clear and legible</li>
                        <li>Accepted formats: PDF, JPG, PNG</li>
                        <li>Maximum file size: 5MB per document</li>
                        <li>Color scans preferred over black & white</li>
                        <li>Ensure all four corners are visible</li>
                        <li>Avoid taking photos with flash (causes glare)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">Verification Timeline</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="font-medium">Standard Verification</div>
                        <div className="text-muted-foreground">1-2 business days</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="font-medium">Express Verification</div>
                        <div className="text-muted-foreground">Same day (before 2 PM)</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Need Help?</h4>
                    <p className="text-sm text-muted-foreground">
                      Contact our KYC support team for assistance.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Email Support
                      </Button>
                      <Button variant="outline" size="sm">
                        Call Support
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <KycTimeline timeline={kycStatus.timeline} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <BenefitsCard benefits={kycStatus.benefits} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Your documents are encrypted and stored securely.</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  256-bit SSL encryption
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ISO 27001 certified storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  GDPR & DPDP compliant
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        documentType={selectedDocumentType}
        onUpload={handleFileUpload}
        isUploading={uploadMutation.isPending}
      />
    </div>
  );
}
