import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts';
import { useLocation, useRoute } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CreditCard,
  Shield,
  Lock,
  CheckCircle,
  Building2,
  Loader2,
  AlertCircle,
  IndianRupee,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceRequest {
  id: number;
  serviceType: string;
  serviceName: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface PaymentResponse {
  paymentId: number;
  clientSecret?: string;
  mode: 'live' | 'simulation';
  message?: string;
  simulationUrl?: string;
}

const PaymentGateway = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
    upiId: '',
    bankAccount: '',
    ifscCode: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  // Get service request ID from URL if present
  const [, params] = useRoute('/payment-gateway/:requestId');
  const requestId = params?.requestId ? parseInt(params.requestId) : null;

  // Fetch pending payments for the client
  const { data: pendingPayments = [], isLoading: loadingPending } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/client/payments/pending'],
  });

  // Fetch payment history
  const { data: paymentHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['/api/client/payments/history'],
  });

  // Select request from URL or pending list
  useEffect(() => {
    if (requestId && pendingPayments.length > 0) {
      const request = pendingPayments.find(r => r.id === requestId);
      if (request) {
        setSelectedRequest(request);
      }
    } else if (pendingPayments.length === 1) {
      setSelectedRequest(pendingPayments[0]);
    }
  }, [requestId, pendingPayments]);

  // Initiate payment mutation
  const initiatePaymentMutation = useMutation({
    mutationFn: async (data: { serviceRequestId?: number; amount: number; paymentMethod: string }) => {
      return apiRequest('POST', '/api/client/payments/initiate', data);
    },
    onSuccess: async (response: PaymentResponse) => {
      setPaymentId(response.paymentId);

      if (response.mode === 'simulation') {
        // In simulation mode, immediately simulate success
        toast({
          title: 'Simulation Mode',
          description: response.message || 'Processing simulated payment...',
        });

        // Auto-complete simulation
        await simulateSuccessMutation.mutateAsync(response.paymentId);
      } else {
        // In live mode, would integrate with Stripe Elements here
        toast({
          title: 'Payment Initiated',
          description: 'Processing your payment...',
        });
        // For now, show success (in real implementation, use Stripe Elements)
        setPaymentSuccess(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive',
      });
      setIsProcessing(false);
    },
  });

  // Simulate success mutation (for demo mode)
  const simulateSuccessMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest('POST', `/api/client/payments/${paymentId}/simulate-success`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payments/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/payments/history'] });
      setPaymentSuccess(true);
      setIsProcessing(false);
      toast({
        title: 'Payment Successful!',
        description: 'Your payment has been processed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to complete payment',
        variant: 'destructive',
      });
      setIsProcessing(false);
    },
  });

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
    { id: 'upi', name: 'UPI Payment', icon: Shield },
    { id: 'netbanking', name: 'Net Banking', icon: Building2 }
  ];

  const handleInputChange = (field: string, value: string) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePaymentData = () => {
    if (paymentMethod === 'card') {
      if (!paymentData.cardNumber || paymentData.cardNumber.length < 16) {
        toast({ title: 'Invalid card number', variant: 'destructive' });
        return false;
      }
      if (!paymentData.expiryMonth || !paymentData.expiryYear) {
        toast({ title: 'Invalid expiry date', variant: 'destructive' });
        return false;
      }
      if (!paymentData.cvv || paymentData.cvv.length < 3) {
        toast({ title: 'Invalid CVV', variant: 'destructive' });
        return false;
      }
      if (!paymentData.holderName) {
        toast({ title: 'Cardholder name required', variant: 'destructive' });
        return false;
      }
    } else if (paymentMethod === 'upi') {
      if (!paymentData.upiId || !paymentData.upiId.includes('@')) {
        toast({ title: 'Invalid UPI ID', variant: 'destructive' });
        return false;
      }
    } else if (paymentMethod === 'netbanking') {
      if (!paymentData.bankAccount || !paymentData.ifscCode) {
        toast({ title: 'Bank details required', variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const handlePayment = () => {
    if (!selectedRequest) {
      toast({ title: 'Please select a service to pay for', variant: 'destructive' });
      return;
    }

    if (!validatePaymentData()) {
      return;
    }

    setIsProcessing(true);
    initiatePaymentMutation.mutate({
      serviceRequestId: selectedRequest.id,
      amount: finalAmount,
      paymentMethod,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const baseAmount = selectedRequest?.totalAmount || 0;
  const gst = Math.round(baseAmount * 0.18);
  const finalAmount = baseAmount + gst;

  // Payment Success View
  if (paymentSuccess) {
    return (
      <DashboardLayout>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your payment of {formatCurrency(finalAmount)} has been processed successfully.
            </p>
            {paymentId && (
              <p className="text-sm text-gray-500 mb-6">
                Payment ID: INV-{paymentId.toString().padStart(6, '0')}
              </p>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => setLocation('/service-tracker')}
                className="w-full"
              >
                Track Your Service
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/portal')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  if (loadingPending) {
    return (
      <DashboardLayout>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/service-requests')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Secure Payment
            </h1>
            <p className="text-lg text-gray-600">
              Complete your payment to proceed with your service request
            </p>
          </div>
        </div>

        {/* No pending payments */}
        {pendingPayments.length === 0 && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Payments</h3>
              <p className="text-gray-600 mb-4">
                You don't have any pending payments at the moment.
              </p>
              <Button onClick={() => setLocation('/services')}>
                Browse Services
              </Button>
            </CardContent>
          </Card>
        )}

        {pendingPayments.length > 0 && (
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
            {/* Payment Methods & Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Select Service Request (if multiple) */}
              {pendingPayments.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Service to Pay</CardTitle>
                    <CardDescription>Choose which service request you want to pay for</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingPayments.map((request) => (
                        <div
                          key={request.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedRequest?.id === request.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedRequest(request)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{request.serviceName || request.serviceType}</p>
                              <p className="text-sm text-gray-600">Request #{request.id}</p>
                            </div>
                            <p className="font-bold text-emerald-600">{formatCurrency(request.totalAmount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Choose Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <div
                          key={method.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            paymentMethod === method.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setPaymentMethod(method.id)}
                        >
                          <div className="text-center">
                            <Icon className={`h-8 w-8 mx-auto mb-2 ${
                              paymentMethod === method.id ? 'text-emerald-600' : 'text-gray-600'
                            }`} />
                            <p className="text-sm font-medium">{method.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Payment Details
                  </CardTitle>
                  <CardDescription>
                    Your payment information is encrypted and secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentMethod === 'card' && (
                    <>
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={paymentData.cardNumber}
                          onChange={(e) => handleInputChange('cardNumber', e.target.value.replace(/\D/g, '').slice(0, 16))}
                          maxLength={16}
                        />
                      </div>
                      <div>
                        <Label htmlFor="holderName">Cardholder Name</Label>
                        <Input
                          id="holderName"
                          placeholder="John Doe"
                          value={paymentData.holderName}
                          onChange={(e) => handleInputChange('holderName', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="expiryMonth">Month</Label>
                          <Select value={paymentData.expiryMonth} onValueChange={(value) => handleInputChange('expiryMonth', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => (
                                <SelectItem key={i+1} value={String(i+1).padStart(2, '0')}>
                                  {String(i+1).padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expiryYear">Year</Label>
                          <Select value={paymentData.expiryYear} onValueChange={(value) => handleInputChange('expiryYear', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="YYYY" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 10}, (_, i) => (
                                <SelectItem key={i} value={String(new Date().getFullYear() + i)}>
                                  {new Date().getFullYear() + i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            placeholder="123"
                            value={paymentData.cvv}
                            onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                            maxLength={4}
                            type="password"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'upi' && (
                    <div>
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input
                        id="upiId"
                        placeholder="yourname@upi"
                        value={paymentData.upiId}
                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                      />
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <>
                      <div>
                        <Label htmlFor="bankAccount">Account Number</Label>
                        <Input
                          id="bankAccount"
                          placeholder="Enter account number"
                          value={paymentData.bankAccount}
                          onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ifscCode">IFSC Code</Label>
                        <Input
                          id="ifscCode"
                          placeholder="HDFC0001234"
                          value={paymentData.ifscCode}
                          onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-900">Secure Payment Processing</AlertTitle>
                <AlertDescription className="text-blue-800">
                  Your payment is processed through encrypted channels with PCI DSS compliance.
                  We do not store your card details on our servers.
                </AlertDescription>
              </Alert>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              {/* Service Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedRequest ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Service</span>
                        <span className="font-medium">{selectedRequest.serviceName || selectedRequest.serviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Request ID</span>
                        <span className="font-medium">#{selectedRequest.id}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span>Base Amount</span>
                        <span>{formatCurrency(baseAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (18%)</span>
                        <span>{formatCurrency(gst)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount</span>
                        <span className="text-emerald-600">{formatCurrency(finalAmount)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <IndianRupee className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>Select a service to see pricing</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing Information */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">Billing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Billing Entity</p>
                    <p className="text-sm font-medium">DigiComply Solutions Private Limited</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">GSTIN</p>
                    <p className="text-sm font-medium">29AAJCD2314K1Z7</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Part of</p>
                    <p className="text-sm font-medium">LegalSuvidha.com Group</p>
                  </div>
                </CardContent>
              </Card>

              {/* Money Back Guarantee */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                    <h4 className="font-medium text-green-900 mb-2">100% Money Back Guarantee</h4>
                    <p className="text-sm text-green-800">
                      If we're unable to complete your service, we'll refund 100% of your payment.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                size="lg"
                className="w-full py-6 text-lg"
                disabled={!selectedRequest || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Pay {selectedRequest ? formatCurrency(finalAmount) : 'Now'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentGateway;
