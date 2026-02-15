import React, { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, PenTool, Shield, Download, Eye, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ESignDocument {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'ready' | 'signed' | 'expired';
  pages: number;
  required: boolean;
  category: string;
  signedAt?: string;
  signedBy?: string;
}

const ESignAgreements = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [signedDocuments, setSignedDocuments] = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Fetch documents from API
  const { data: documents = [], isLoading, error } = useQuery<ESignDocument[]>({
    queryKey: ['/api/esign/documents'],
    queryFn: async () => {
      const response = await fetch('/api/esign/documents', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    },
  });

  // Sign document mutation
  const signDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/esign/documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signatureData: 'digital-consent',
          agreedToTerms: true,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to sign document');
      }
      return response.json();
    },
    onSuccess: (data, documentId) => {
      setSignedDocuments(prev => [...prev, documentId]);
      queryClient.invalidateQueries({ queryKey: ['/api/esign/documents'] });
      toast({
        title: "Document Signed",
        description: "Document has been digitally signed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Signing Failed",
        description: "Failed to sign the document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDocumentSign = (docId: string) => {
    if (signedDocuments.includes(docId)) {
      // Toggle off locally (backend would need separate unsign endpoint)
      setSignedDocuments(prev => prev.filter(id => id !== docId));
    } else {
      signDocumentMutation.mutate(docId);
    }
  };

  const handleContinue = () => {
    const requiredDocs = documents.filter(doc => doc.required).map(doc => doc.id);
    const allRequiredSigned = requiredDocs.every(docId => signedDocuments.includes(docId));

    if (allRequiredSigned && agreedToTerms) {
      localStorage.setItem('signedDocuments', JSON.stringify(signedDocuments));
      setLocation('/payment-gateway');
    }
  };

  const getStatusIcon = (status: string, isSigned: boolean) => {
    if (isSigned || status === 'signed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (status === 'ready') {
      return <PenTool className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Documents</h3>
            <p className="text-gray-600 mb-4">Please try again or contact support.</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiredDocs = documents.filter(doc => doc.required);
  const signedRequiredCount = requiredDocs.filter(doc => signedDocuments.includes(doc.id) || doc.status === 'signed').length;
  const allRequiredSigned = signedRequiredCount === requiredDocs.length;

  return (
    <DashboardLayout>
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            E-Sign Legal Agreements
          </h1>
          <p className="text-lg text-gray-600">
            Digitally sign the required incorporation documents
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Step 6: E-Sign Agreements</h3>
            <span>6 of 8 steps</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-3/4 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-4xl mx-auto">
          {/* Signing Progress */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Document Signing Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Required documents signed: {signedRequiredCount}/{requiredDocs.length}</span>
                  <span>Total documents: {signedDocuments.length}/{documents.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${requiredDocs.length ? (signedRequiredCount / requiredDocs.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <div className="space-y-4 mb-8">
            {documents.map((document) => {
              const isSigned = signedDocuments.includes(document.id) || document.status === 'signed';

              return (
                <Card
                  key={document.id}
                  className={`transition-all duration-200 ${
                    isSigned ? 'bg-green-50 border-green-200' : 'hover:shadow-md'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(document.status, isSigned)}
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {document.title}
                            {document.required && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{document.description}</CardDescription>
                          <p className="text-sm text-gray-500 mt-1">{document.pages} pages</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          onClick={() => handleDocumentSign(document.id)}
                          variant={isSigned ? "default" : "outline"}
                          size="sm"
                          className={isSigned ? "bg-green-600 hover:bg-green-700" : ""}
                          disabled={signDocumentMutation.isPending}
                        >
                          {signDocumentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <PenTool className="h-4 w-4 mr-1" />
                          )}
                          {isSigned ? 'Signed' : 'Sign'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Terms and Conditions */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the terms and conditions
                  </label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to our{' '}
                    <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>.
                    You also confirm that all information provided is accurate and complete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Secure Digital Signing</h4>
                  <p className="text-sm text-blue-800">
                    All documents are digitally signed using 256-bit SSL encryption.
                    Your signatures are legally binding and comply with IT Act 2000.
                    Documents are stored securely and are accessible anytime from your dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="text-center">
            <Button
              onClick={handleContinue}
              disabled={!allRequiredSigned || !agreedToTerms}
              size="lg"
              className="px-8 py-3"
            >
              Proceed to Payment
            </Button>
            {(!allRequiredSigned || !agreedToTerms) && (
              <p className="text-sm text-gray-600 mt-2">
                {!allRequiredSigned && "Please sign all required documents. "}
                {!agreedToTerms && "Please accept the terms and conditions."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default ESignAgreements;
