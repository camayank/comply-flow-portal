
import React, { useState, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentType {
  code: string;
  name: string;
  description: string;
  required: boolean;
  allowedTypes: string[];
  maxSize: string;
}

interface UploadedDocument {
  id: number;
  doctype: string;
  filename: string;
  status: string;
  uploadedAt: string;
  url?: string;
}

const DocumentUpload = () => {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/documents/:serviceRequestId');
  const serviceRequestId = params?.serviceRequestId ? parseInt(params.serviceRequestId) : null;

  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document types from backend
  const { data: documentTypes = [] } = useQuery<DocumentType[]>({
    queryKey: ['/api/document-types'],
  });

  // Fetch already uploaded documents for this service request
  const { data: uploadedDocuments = [], isLoading: loadingDocs } = useQuery<UploadedDocument[]>({
    queryKey: ['/api/service-requests', serviceRequestId, 'documents'],
    enabled: !!serviceRequestId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ doctype, file }: { doctype: string; file: File }) => {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('doctype', doctype);

      const response = await fetch(`/api/service-requests/${serviceRequestId}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/service-requests', serviceRequestId, 'documents']
      });
      toast({
        title: 'Document Uploaded',
        description: `${variables.file.name} has been uploaded successfully.`,
      });
      setUploadingDocType(null);
      setUploadProgress(prev => ({ ...prev, [variables.doctype]: 100 }));
    },
    onError: (error: Error, variables) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
      setUploadingDocType(null);
      setUploadProgress(prev => ({ ...prev, [variables.doctype]: 0 }));
    },
  });

  // Default documents if no service request (fallback mode)
  const requiredDocuments: DocumentType[] = documentTypes.length > 0 ? documentTypes : [
    { code: 'incorporation_cert', name: 'Certificate of Incorporation', description: 'Company incorporation certificate', required: true, allowedTypes: ['application/pdf'], maxSize: '5MB' },
    { code: 'pan_card', name: 'PAN Card', description: 'Permanent Account Number card', required: true, allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxSize: '5MB' },
    { code: 'aadhar_card', name: 'Aadhar Card', description: 'Address proof / ID document', required: true, allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxSize: '5MB' },
    { code: 'bank_statement', name: 'Bank Statement', description: 'Recent bank statement', required: false, allowedTypes: ['application/pdf'], maxSize: '10MB' },
    { code: 'gst_certificate', name: 'GST Certificate', description: 'GST registration certificate', required: false, allowedTypes: ['application/pdf'], maxSize: '5MB' }
  ];

  const isDocumentUploaded = useCallback((doctype: string) => {
    return uploadedDocuments.some(doc => doc.doctype === doctype);
  }, [uploadedDocuments]);

  const getUploadedDoc = useCallback((doctype: string) => {
    return uploadedDocuments.find(doc => doc.doctype === doctype);
  }, [uploadedDocuments]);

  const handleFileSelect = async (doctype: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!serviceRequestId) {
      // Fallback mode without service request - store locally
      toast({
        title: 'Demo Mode',
        description: 'Document upload saved locally. Create a service request for full upload.',
      });
      const existing = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      if (!existing.includes(doctype)) {
        existing.push(doctype);
        localStorage.setItem('uploadedDocuments', JSON.stringify(existing));
        // Force re-render
        setUploadProgress(prev => ({ ...prev, [doctype]: 100 }));
      }
      return;
    }

    setUploadingDocType(doctype);
    setUploadProgress(prev => ({ ...prev, [doctype]: 30 }));

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => ({
        ...prev,
        [doctype]: Math.min((prev[doctype] || 30) + 10, 90)
      }));
    }, 200);

    try {
      await uploadMutation.mutateAsync({ doctype, file });
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleUploadClick = (doctype: string) => {
    fileInputRefs.current[doctype]?.click();
  };

  const handleContinue = () => {
    setLocation('/payment-gateway');
  };

  const requiredUploaded = requiredDocuments.filter(doc =>
    doc.required && (isDocumentUploaded(doc.code) || uploadProgress[doc.code] === 100)
  ).length;

  const requiredTotal = requiredDocuments.filter(doc => doc.required).length;
  const totalUploaded = requiredDocuments.filter(doc =>
    isDocumentUploaded(doc.code) || uploadProgress[doc.code] === 100
  ).length;

  if (loadingDocs && serviceRequestId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Documents
          </h1>
          <p className="text-lg text-gray-600">
            Upload the required documents to proceed with your compliance applications
          </p>
          {!serviceRequestId && (
            <p className="text-sm text-amber-600 mt-2">
              Running in demo mode - create a service request for full functionality
            </p>
          )}
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Stage 2: Document Upload</h3>
            <span>3 of 5 stages</span>
          </div>
          <div className="w-full bg-purple-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-3/5 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-4xl mx-auto">
          {/* Upload Progress */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Required documents: {requiredUploaded}/{requiredTotal}</span>
                  <span>Total uploaded: {totalUploaded}/{requiredDocuments.length}</span>
                </div>
                <Progress value={(totalUploaded / requiredDocuments.length) * 100} />
              </div>
            </CardContent>
          </Card>

          {/* Document Upload Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {requiredDocuments.map((document) => {
              const isUploaded = isDocumentUploaded(document.code) || uploadProgress[document.code] === 100;
              const uploadedDoc = getUploadedDoc(document.code);
              const isUploading = uploadingDocType === document.code;
              const progress = uploadProgress[document.code] || 0;

              return (
                <Card
                  key={document.code}
                  className={`transition-all duration-200 ${
                    isUploaded ? 'bg-green-50 border-green-200' : 'hover:shadow-md'
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                        ) : isUploaded ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Upload className="h-5 w-5 text-gray-400" />
                        )}
                        {document.name}
                      </span>
                      {document.required && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {isUploading
                        ? 'Uploading...'
                        : isUploaded
                          ? `Uploaded: ${uploadedDoc?.filename || 'Document uploaded'}`
                          : document.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={(el) => fileInputRefs.current[document.code] = el}
                      onChange={(e) => handleFileSelect(document.code, e)}
                      accept={document.allowedTypes?.join(',')}
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-gray-500 text-center">{progress}% uploaded</p>
                      </div>
                    ) : isUploaded ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Upload complete</span>
                        </div>
                        <div className="flex gap-2">
                          {uploadedDoc?.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(uploadedDoc.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUploadClick(document.code)}
                          >
                            Replace
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleUploadClick(document.code)}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {document.name}
                      </Button>
                    )}

                    {/* File type hint */}
                    {!isUploaded && !isUploading && (
                      <p className="text-xs text-gray-400 mt-2">
                        Max size: {document.maxSize}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Continue Section */}
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {requiredUploaded < requiredTotal ? (
                  <div className="flex items-center gap-2 text-amber-600 justify-center">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Please upload all required documents to continue
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 justify-center">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">All required documents uploaded</span>
                  </div>
                )}

                <Button
                  onClick={handleContinue}
                  className="w-full"
                  disabled={requiredUploaded < requiredTotal || uploadingDocType !== null}
                >
                  {uploadingDocType ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
