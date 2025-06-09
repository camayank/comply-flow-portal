import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, Lock, CheckCircle, Calendar, User, Building2 } from 'lucide-react';

const PaymentGateway = () => {
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState('card');
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

  // Get package data from localStorage
  const packageData = JSON.parse(localStorage.getItem('selectedPackage') || '{}');
  const founderData = JSON.parse(localStorage.getItem('founderDetails') || '{}');

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

  const handlePayment = () => {
    // Store payment data
    localStorage.setItem('paymentData', JSON.stringify({
      method: paymentMethod,
      data: paymentData,
      timestamp: new Date().toISOString()
    }));
    setLocation('/tracker');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const total = packageData.total || 0;
  const gst = Math.round(total * 0.18);
  const finalAmount = total + gst;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Secure Payment
          </h1>
          <p className="text-lg text-gray-600">
            Complete your payment to finalize the incorporation process
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Step 7: Payment Gateway</h3>
            <span>7 of 8 steps</span>
          </div>
          <div className="w-full bg-emerald-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-7/8 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Payment Methods & Form */}
          <div className="lg:col-span-2 space-y-6">
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
                        onChange={(e) => handleInputChange('cardNumber', e.target.value)}
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
                          onChange={(e) => handleInputChange('cvv', e.target.value)}
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
                        onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Secure Payment Processing</h4>
                    <p className="text-sm text-blue-800">
                      Your payment is processed through encrypted channels with PCI DSS compliance. 
                      We do not store your card details on our servers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Package Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Package</span>
                    <span className="font-medium">{packageData.package || 'Selected Package'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Amount</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  {packageData.addons && packageData.addons.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Add-ons:</p>
                      {packageData.addons.map((addon: string, index: number) => (
                        <div key={index} className="flex justify-between text-sm text-gray-600 ml-4">
                          <span>• {addon}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span>{formatCurrency(gst)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span>{formatCurrency(finalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="font-medium">{founderData.companyName || 'Your Company'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Founder</p>
                  <p className="font-medium">{founderData.founderName || 'Founder Name'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{founderData.email || 'email@example.com'}</p>
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
                    If we're unable to incorporate your company, we'll refund 100% of your payment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Button 
              onClick={handlePayment}
              size="lg"
              className="w-full py-4 text-lg"
            >
              Pay {formatCurrency(finalAmount)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;