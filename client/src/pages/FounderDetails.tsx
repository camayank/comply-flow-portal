import React, { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, MapPin, Building2, Calendar } from 'lucide-react';

const FounderDetails = () => {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    founderName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    companyName: '',
    proposedActivity: '',
    authorizedCapital: '',
    paidUpCapital: '',
    numberOfDirectors: '1',
    incorporationState: ''
  });

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('founderDetails', JSON.stringify(formData));
    setLocation('/industry-classification');
  };

  const isFormValid = () => {
    return formData.founderName && formData.email && formData.phone && 
           formData.companyName && formData.proposedActivity && 
           formData.authorizedCapital && formData.incorporationState;
  };

  return (
    <DashboardLayout>
    <div className="bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Founder & Company Details
          </h1>
          <p className="text-lg text-gray-600">
            Provide your personal and company information for registration
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-green-600 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Step 3: Founder & Company Details</h3>
            <span>3 of 8 steps</span>
          </div>
          <div className="w-full bg-green-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-3/8 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Founder Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Founder Details
                </CardTitle>
                <CardDescription>
                  Personal information of the primary founder/director
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="founderName">Full Name *</Label>
                  <Input
                    id="founderName"
                    value={formData.founderName}
                    onChange={(e) => handleInputChange('founderName', e.target.value)}
                    placeholder="Enter full name as per PAN"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numberOfDirectors">Number of Directors</Label>
                  <Select value={formData.numberOfDirectors} onValueChange={(value) => handleInputChange('numberOfDirectors', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select number of directors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Director</SelectItem>
                      <SelectItem value="2">2 Directors</SelectItem>
                      <SelectItem value="3">3 Directors</SelectItem>
                      <SelectItem value="4">4 Directors</SelectItem>
                      <SelectItem value="5+">5+ Directors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Address Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Details
                </CardTitle>
                <CardDescription>
                  Registered office address information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Complete Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    rows={3}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {indianStates.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pincode">PIN Code</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      placeholder="Enter PIN code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Details
                </CardTitle>
                <CardDescription>
                  Basic company information for incorporation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Proposed Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Enter proposed company name"
                    required
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    We'll check name availability and suggest alternatives if needed
                  </p>
                </div>
                <div>
                  <Label htmlFor="proposedActivity">Business Activity *</Label>
                  <Textarea
                    id="proposedActivity"
                    value={formData.proposedActivity}
                    onChange={(e) => handleInputChange('proposedActivity', e.target.value)}
                    placeholder="Describe your main business activities"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="authorizedCapital">Authorized Capital *</Label>
                    <Select value={formData.authorizedCapital} onValueChange={(value) => handleInputChange('authorizedCapital', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select authorized capital" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100000">₹1,00,000</SelectItem>
                        <SelectItem value="500000">₹5,00,000</SelectItem>
                        <SelectItem value="1000000">₹10,00,000</SelectItem>
                        <SelectItem value="2500000">₹25,00,000</SelectItem>
                        <SelectItem value="5000000">₹50,00,000</SelectItem>
                        <SelectItem value="custom">Custom Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paidUpCapital">Paid-up Capital</Label>
                    <Input
                      id="paidUpCapital"
                      value={formData.paidUpCapital}
                      onChange={(e) => handleInputChange('paidUpCapital', e.target.value)}
                      placeholder="Enter paid-up capital"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="incorporationState">State of Incorporation *</Label>
                  <Select value={formData.incorporationState} onValueChange={(value) => handleInputChange('incorporationState', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state for incorporation" />
                    </SelectTrigger>
                    <SelectContent>
                      {indianStates.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Continue Button */}
            <div className="text-center">
              <Button 
                type="submit"
                disabled={!isFormValid()}
                size="lg"
                className="px-8 py-3"
              >
                Continue to Industry Classification
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default FounderDetails;