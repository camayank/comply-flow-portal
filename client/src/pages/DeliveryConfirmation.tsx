import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText, 
  Star,
  Calendar,
  User,
  Package,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Shield,
  Award,
  Signature
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { type DeliveryConfirmation, type ServiceRequest, type ClientFeedback } from '@shared/schema';

interface DeliveryDetails {
  serviceRequest: ServiceRequest;
  deliveryConfirmation: DeliveryConfirmation;
  deliverables: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    downloadUrl: string;
    description: string;
    isOfficial: boolean;
    verificationStatus: string;
  }>;
  handoffDocument: {
    qcApprovalDate: string;
    qualityScore: number;
    reviewNotes: string;
    completionSummary: string;
    nextSteps?: string[];
    warranties?: string[];
    supportInfo?: {
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      supportHours: string;
    };
  };
  clientName: string;
  serviceName: string;
}

interface FeedbackFormData {
  overallRating: number;
  serviceQuality: number;
  timeliness: number;
  communication: number;
  documentation: number;
  positiveAspects: string;
  improvementSuggestions: string;
  additionalComments: string;
  npsScore: number;
  wouldRecommend: boolean;
  hasIssues: boolean;
  issuesDescription: string;
}

export default function DeliveryConfirmation() {
  const { deliveryId } = useParams();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const confirmationToken = urlParams.get('token');
  
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [feedbackData, setFeedbackData] = useState<FeedbackFormData>({
    overallRating: 0,
    serviceQuality: 0,
    timeliness: 0,
    communication: 0,
    documentation: 0,
    positiveAspects: '',
    improvementSuggestions: '',
    additionalComments: '',
    npsScore: 0,
    wouldRecommend: false,
    hasIssues: false,
    issuesDescription: ''
  });

  const queryClient = useQueryClient();

  // Fetch delivery details
  const { data: deliveryDetails, isLoading } = useQuery<DeliveryDetails>({
    queryKey: ['delivery-confirmation', deliveryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (confirmationToken) params.append('token', confirmationToken);
      
      const response = await fetch(`/api/delivery/${deliveryId}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch delivery details');
      }
      return response.json();
    },
    enabled: !!deliveryId
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: async (data: { signature?: string }) => {
      return apiRequest(`/api/delivery/${deliveryId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          confirmationMethod: 'portal_click',
          clientSignature: data.signature || null,
          confirmedAt: new Date().toISOString()
        })
      });
    },
    onSuccess: () => {
      setIsConfirmed(true);
      queryClient.invalidateQueries({ queryKey: ['delivery-confirmation', deliveryId] });
    }
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      return apiRequest(`/api/delivery/${deliveryId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          feedbackChannel: 'portal',
          serviceCategory: deliveryDetails?.serviceRequest.serviceId,
          specificService: deliveryDetails?.serviceName
        })
      });
    },
    onSuccess: () => {
      setShowFeedbackForm(false);
      queryClient.invalidateQueries({ queryKey: ['delivery-confirmation', deliveryId] });
    }
  });

  // Download deliverable
  const downloadDeliverable = async (downloadUrl: string, filename: string) => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleConfirmDelivery = () => {
    confirmDeliveryMutation.mutate({ signature: digitalSignature });
  };

  const handleSubmitFeedback = () => {
    submitFeedbackMutation.mutate(feedbackData);
  };

  const renderStarRating = (rating: number, onRatingChange: (rating: number) => void, label: string) => (
    <div className="flex items-center gap-2">
      <Label className="w-24 text-sm">{label}:</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRatingChange(star)}
            className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
            data-testid={`star-${label.toLowerCase()}-${star}`}
          >
            <Star className="h-5 w-5" fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">{rating}/5</span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!deliveryDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Delivery Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            The delivery confirmation link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const isAlreadyConfirmed = deliveryDetails.deliveryConfirmation.clientConfirmedAt;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
            <Package className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Service Delivery Complete</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Your {deliveryDetails.serviceName} is ready for delivery
          </p>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Quality Approved - Score: {deliveryDetails.handoffDocument.qualityScore}%
          </Badge>
        </div>

        {/* Service Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Service Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Client</Label>
                <p className="text-gray-900 dark:text-white">{deliveryDetails.clientName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Service</Label>
                <p className="text-gray-900 dark:text-white">{deliveryDetails.serviceName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">QC Approval Date</Label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(deliveryDetails.handoffDocument.qcApprovalDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Quality Score</Label>
                <div className="flex items-center gap-2">
                  <Progress value={deliveryDetails.handoffDocument.qualityScore} className="flex-1" />
                  <span className="font-semibold">{deliveryDetails.handoffDocument.qualityScore}%</span>
                </div>
              </div>
            </div>
            {deliveryDetails.handoffDocument.reviewNotes && (
              <div>
                <Label className="text-sm font-medium">Quality Review Notes</Label>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {deliveryDetails.handoffDocument.reviewNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliverables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Your Deliverables
            </CardTitle>
            <CardDescription>
              Download your completed documents and certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliveryDetails.deliverables.map((deliverable) => (
                <div key={deliverable.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${deliverable.isOfficial ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{deliverable.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{deliverable.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{deliverable.size}</span>
                        {deliverable.isOfficial && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Official Document
                          </Badge>
                        )}
                        {deliverable.verificationStatus === 'verified' && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadDeliverable(deliverable.downloadUrl, deliverable.name)}
                    size="sm"
                    data-testid={`download-${deliverable.id}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Handoff Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Service Completion Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">What's Included:</h4>
              <p className="text-gray-700 dark:text-gray-300">
                {deliveryDetails.handoffDocument.completionSummary}
              </p>
            </div>
            
            {deliveryDetails.handoffDocument.nextSteps && (
              <div>
                <h4 className="font-medium mb-2">Next Steps:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {deliveryDetails.handoffDocument.nextSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {deliveryDetails.handoffDocument.warranties && (
              <div>
                <h4 className="font-medium mb-2">Warranties & Guarantees:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {deliveryDetails.handoffDocument.warranties.map((warranty, index) => (
                    <li key={index}>{warranty}</li>
                  ))}
                </ul>
              </div>
            )}

            {deliveryDetails.handoffDocument.supportInfo && (
              <div>
                <h4 className="font-medium mb-2">Support Information:</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                  <p><strong>Contact:</strong> {deliveryDetails.handoffDocument.supportInfo.contactName}</p>
                  <p><strong>Email:</strong> {deliveryDetails.handoffDocument.supportInfo.contactEmail}</p>
                  <p><strong>Phone:</strong> {deliveryDetails.handoffDocument.supportInfo.contactPhone}</p>
                  <p><strong>Hours:</strong> {deliveryDetails.handoffDocument.supportInfo.supportHours}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Confirmation */}
        {!isAlreadyConfirmed && !isConfirmed && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Signature className="h-5 w-5" />
                Confirm Delivery Acceptance
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Please confirm that you have received and reviewed all deliverables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="digital-signature">Digital Signature (Optional)</Label>
                <Textarea
                  id="digital-signature"
                  placeholder="Type your full name to digitally sign..."
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  data-testid="textarea-signature"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmDelivery}
                  disabled={confirmDeliveryMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-delivery"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {confirmDeliveryMutation.isPending ? 'Confirming...' : 'Confirm Delivery'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackForm(true)}
                  data-testid="button-provide-feedback"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Provide Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Success */}
        {(isAlreadyConfirmed || isConfirmed) && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                Delivery Confirmed!
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-4">
                Thank you for confirming receipt of your service deliverables.
                {isAlreadyConfirmed && ` Confirmed on ${new Date(deliveryDetails.deliveryConfirmation.clientConfirmedAt!).toLocaleDateString()}`}
              </p>
              {!showFeedbackForm && (
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackForm(true)}
                  className="border-green-600 text-green-700 hover:bg-green-100"
                  data-testid="button-feedback-later"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Share Your Experience
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback Form Dialog */}
        <Dialog open={showFeedbackForm} onOpenChange={setShowFeedbackForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Share Your Experience</DialogTitle>
              <DialogDescription>
                Your feedback helps us improve our services
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Overall Rating */}
              <div>
                <h4 className="font-medium mb-3">Overall Experience</h4>
                {renderStarRating(
                  feedbackData.overallRating,
                  (rating) => setFeedbackData(prev => ({ ...prev, overallRating: rating })),
                  'Overall'
                )}
              </div>

              {/* Detailed Ratings */}
              <div>
                <h4 className="font-medium mb-3">Rate Each Aspect</h4>
                <div className="space-y-3">
                  {renderStarRating(
                    feedbackData.serviceQuality,
                    (rating) => setFeedbackData(prev => ({ ...prev, serviceQuality: rating })),
                    'Quality'
                  )}
                  {renderStarRating(
                    feedbackData.timeliness,
                    (rating) => setFeedbackData(prev => ({ ...prev, timeliness: rating })),
                    'Timeliness'
                  )}
                  {renderStarRating(
                    feedbackData.communication,
                    (rating) => setFeedbackData(prev => ({ ...prev, communication: rating })),
                    'Communication'
                  )}
                  {renderStarRating(
                    feedbackData.documentation,
                    (rating) => setFeedbackData(prev => ({ ...prev, documentation: rating })),
                    'Documentation'
                  )}
                </div>
              </div>

              {/* NPS Score */}
              <div>
                <Label className="font-medium">How likely are you to recommend us? (0-10)</Label>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => setFeedbackData(prev => ({ ...prev, npsScore: score, wouldRecommend: score >= 7 }))}
                      className={`w-8 h-8 text-sm rounded ${
                        score === feedbackData.npsScore 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      data-testid={`nps-${score}`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Written Feedback */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="positive-aspects">What did we do well?</Label>
                  <Textarea
                    id="positive-aspects"
                    placeholder="Tell us what you liked..."
                    value={feedbackData.positiveAspects}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, positiveAspects: e.target.value }))}
                    data-testid="textarea-positive"
                  />
                </div>
                <div>
                  <Label htmlFor="improvements">How can we improve?</Label>
                  <Textarea
                    id="improvements"
                    placeholder="Share your suggestions..."
                    value={feedbackData.improvementSuggestions}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, improvementSuggestions: e.target.value }))}
                    data-testid="textarea-improvements"
                  />
                </div>
                <div>
                  <Label htmlFor="additional-comments">Additional Comments</Label>
                  <Textarea
                    id="additional-comments"
                    placeholder="Anything else you'd like to share..."
                    value={feedbackData.additionalComments}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, additionalComments: e.target.value }))}
                    data-testid="textarea-additional"
                  />
                </div>
              </div>

              {/* Issues Section */}
              <div>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={feedbackData.hasIssues}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, hasIssues: e.target.checked }))}
                    data-testid="checkbox-has-issues"
                  />
                  I experienced issues with the service
                </Label>
                {feedbackData.hasIssues && (
                  <Textarea
                    placeholder="Please describe the issues you encountered..."
                    value={feedbackData.issuesDescription}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, issuesDescription: e.target.value }))}
                    className="mt-2"
                    data-testid="textarea-issues"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackForm(false)}
                  data-testid="button-cancel-feedback"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submitFeedbackMutation.isPending || feedbackData.overallRating === 0}
                  data-testid="button-submit-feedback"
                >
                  {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}