import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Factory, Store, Briefcase, Users, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import TrustBar from '@/components/TrustBar';
import DashboardNav from '@/components/DashboardNav';

interface BusinessProfile {
  businessType: string;
  industryCode: string;
  companyName: string;
  expectedTurnover: string;
  employeeCount: string;
  operatingStates: string[];
  urgentServices: string[];
}

const StreamlinedOnboarding = () => {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<BusinessProfile>({
    businessType: '',
    industryCode: '',
    companyName: '',
    expectedTurnover: '',
    employeeCount: '',
    operatingStates: [],
    urgentServices: []
  });

  const businessTypes = [
    {
      id: 'private_limited',
      name: 'Private Limited Company',
      icon: Building2,
      description: 'Most popular for startups and growing businesses',
      compliance: ['MCA Filings', 'Income Tax', 'GST'],
      urgentServices: ['ADT-1', 'INC-20A', 'GST Registration']
    },
    {
      id: 'llp',
      name: 'Limited Liability Partnership',
      icon: Users,
      description: 'Professional services and partnerships',
      compliance: ['LLP Filings', 'Income Tax', 'GST'],
      urgentServices: ['Form 8', 'Form 11', 'GST Registration']
    },
    {
      id: 'opc',
      name: 'One Person Company',
      icon: Briefcase,
      description: 'Single founder businesses',
      compliance: ['MCA Filings', 'Income Tax', 'GST'],
      urgentServices: ['ADT-1', 'INC-20A', 'MSME Registration']
    },
    {
      id: 'proprietorship',
      name: 'Sole Proprietorship',
      icon: Store,
      description: 'Simple business structure',
      compliance: ['Income Tax', 'GST', 'Trade License'],
      urgentServices: ['GST Registration', 'Trade License', 'MSME Registration']
    }
  ];

  const industryCategories = [
    { code: '6201', name: 'Software Development', nicCode: 'NIC 6201', urgentServices: ['GST', 'ITES Registration'] },
    { code: '4621', name: 'Trading Business', nicCode: 'NIC 4621', urgentServices: ['GST', 'Import Export Code'] },
    { code: '2511', name: 'Manufacturing', nicCode: 'NIC 2511', urgentServices: ['Factory License', 'Pollution Clearance'] },
    { code: '6920', name: 'Consulting Services', nicCode: 'NIC 6920', urgentServices: ['Professional Tax', 'Service Tax'] },
    { code: '5610', name: 'Restaurant/Food', nicCode: 'NIC 5610', urgentServices: ['FSSAI License', 'GST Registration'] },
    { code: '4711', name: 'Retail Business', nicCode: 'NIC 4711', urgentServices: ['Shop Establishment', 'GST Registration'] }
  ];

  const turnoverRanges = [
    { value: '0-20L', label: 'Up to ₹20 Lakhs', gstRequired: false, auditRequired: false },
    { value: '20L-2Cr', label: '₹20 Lakhs - ₹2 Crores', gstRequired: true, auditRequired: false },
    { value: '2Cr-5Cr', label: '₹2 Crores - ₹5 Crores', gstRequired: true, auditRequired: true },
    { value: '5Cr+', label: 'Above ₹5 Crores', gstRequired: true, auditRequired: true }
  ];

  const getAutoSuggestedServices = () => {
    const services = [];
    const selectedBusiness = businessTypes.find(bt => bt.id === profile.businessType);
    const selectedIndustry = industryCategories.find(ic => ic.code === profile.industryCode);
    const selectedTurnover = turnoverRanges.find(tr => tr.value === profile.expectedTurnover);

    if (selectedBusiness) {
      services.push(...selectedBusiness.urgentServices);
    }
    
    if (selectedIndustry) {
      services.push(...selectedIndustry.urgentServices);
    }

    if (selectedTurnover?.gstRequired) {
      services.push('GST Registration');
    }

    if (selectedTurnover?.auditRequired) {
      services.push('Audit Services');
    }

    return Array.from(new Set(services)); // Remove duplicates
  };

  const handleQuickStart = () => {
    // Auto-detect and pre-fill based on common patterns
    if (profile.companyName.toLowerCase().includes('tech') || profile.companyName.toLowerCase().includes('software')) {
      setProfile(prev => ({
        ...prev,
        businessType: 'private_limited',
        industryCode: '6201',
        expectedTurnover: '20L-2Cr'
      }));
    }
    
    // Store in localStorage for next steps
    localStorage.setItem('streamlinedProfile', JSON.stringify(profile));
    setLocation('/services');
  };

  const handleComplete = () => {
    const completeProfile = {
      ...profile,
      urgentServices: getAutoSuggestedServices()
    };
    
    localStorage.setItem('streamlinedProfile', JSON.stringify(completeProfile));
    localStorage.setItem('businessType', profile.businessType);
    localStorage.setItem('industryClassification', profile.industryCode);
    
    setLocation('/services');
  };

  const isProfileComplete = profile.businessType && profile.industryCode && profile.companyName && profile.expectedTurnover;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <DashboardNav />
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Let's Set Up Your Business Profile
          </h1>
          <p className="text-lg text-gray-600">
            Streamlined onboarding - complete in under 2 minutes
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Smart Onboarding</h3>
            <span>1 of 3 steps</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-1/3 transition-all duration-300"></div>
          </div>
        </Card>

        <TrustBar />

        {/* Quick Start Option */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Zap className="h-5 w-5" />
              Quick Start for Returning Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-4">
              Already have MCA/GSTN registration? We can auto-fetch your business details.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CIN/LLPIN Number</Label>
                <Input placeholder="Enter your CIN/LLPIN" />
              </div>
              <div>
                <Label>GSTIN (if available)</Label>
                <Input placeholder="Enter your GSTIN" />
              </div>
            </div>
            <Button onClick={handleQuickStart} className="mt-4 bg-green-600 hover:bg-green-700">
              Auto-Fill Details
            </Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Business Type & Industry */}
          <Card>
            <CardHeader>
              <CardTitle>Business Structure & Industry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Company Name</Label>
                <Input
                  placeholder="Enter your company name"
                  value={profile.companyName}
                  onChange={(e) => setProfile({...profile, companyName: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Business Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {businessTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          profile.businessType === type.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setProfile({...profile, businessType: type.id})}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${
                          profile.businessType === type.id ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                        <h3 className="font-medium text-sm">{type.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Industry Classification</Label>
                <Select value={profile.industryCode} onValueChange={(value) => setProfile({...profile, industryCode: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryCategories.map((industry) => (
                      <SelectItem key={industry.code} value={industry.code}>
                        <div className="flex justify-between items-center w-full">
                          <span>{industry.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {industry.nicCode}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Business Scale & Compliance Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Business Scale & Compliance Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Expected Annual Turnover</Label>
                <Select value={profile.expectedTurnover} onValueChange={(value) => setProfile({...profile, expectedTurnover: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select turnover range" />
                  </SelectTrigger>
                  <SelectContent>
                    {turnoverRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        <div className="flex justify-between items-center w-full">
                          <span>{range.label}</span>
                          <div className="flex gap-1 ml-2">
                            {range.gstRequired && <Badge className="text-xs bg-blue-100 text-blue-800">GST</Badge>}
                            {range.auditRequired && <Badge className="text-xs bg-purple-100 text-purple-800">Audit</Badge>}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Employee Count</Label>
                <Select value={profile.employeeCount} onValueChange={(value) => setProfile({...profile, employeeCount: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5 employees</SelectItem>
                    <SelectItem value="6-20">6-20 employees</SelectItem>
                    <SelectItem value="21-50">21-50 employees</SelectItem>
                    <SelectItem value="50+">50+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-Suggested Services Preview */}
              {isProfileComplete && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Recommended Services
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getAutoSuggestedServices().map((service) => (
                      <Badge key={service} className="bg-yellow-100 text-yellow-800">
                        {service}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    Based on your profile, these services are recommended for immediate setup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={() => setLocation('/')}>
            Back to Home
          </Button>
          
          <Button 
            onClick={handleComplete}
            disabled={!isProfileComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            Continue to Services
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StreamlinedOnboarding;