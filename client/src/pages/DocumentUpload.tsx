
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const DocumentUpload = () => {
  const [, setLocation] = useLocation();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const requiredDocuments = [
    { id: 'incorporation', name: 'Certificate of Incorporation', required: true },
    { id: 'pan', name: 'PAN Card', required: true },
    { id: 'address', name: 'Address Proof', required: true },
    { id: 'bank', name: 'Bank Statement', required: false },
    { id: 'gst', name: 'GST Certificate', required: false }
  ];

  const handleFileUpload = (documentId: string) => {
    // Simulate file upload
    if (!uploadedFiles.includes(documentId)) {
      setUploadedFiles(prev => [...prev, documentId]);
      setUploadProgress(prev => prev + 20);
    }
  };

  const handleContinue = () => {
    localStorage.setItem('uploadedDocuments', JSON.stringify(uploadedFiles));
    setLocation('/tracker');
  };

  const requiredUploaded = uploadedFiles.filter(id => 
    requiredDocuments.find(doc => doc.id === id && doc.required)
  ).length;

  const requiredTotal = requiredDocuments.filter(doc => doc.required).length;

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
                  <span>Total uploaded: {uploadedFiles.length}/{requiredDocuments.length}</span>
                </div>
                <Progress value={(uploadedFiles.length / requiredDocuments.length) * 100} />
              </div>
            </CardContent>
          </Card>

          {/* Document Upload Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {requiredDocuments.map((document) => {
              const isUploaded = uploadedFiles.includes(document.id);
              
              return (
                <Card 
                  key={document.id}
                  className={`transition-all duration-200 ${
                    isUploaded ? 'bg-green-50 border-green-200' : 'hover:shadow-md'
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {isUploaded ? (
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
                      {isUploaded ? 'Document uploaded successfully' : 'Click to upload document'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {isUploaded ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Upload complete</span>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleFileUpload(document.id)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {document.name}
                      </Button>
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
                  disabled={requiredUploaded < requiredTotal}
                >
                  Continue to Tracker
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
