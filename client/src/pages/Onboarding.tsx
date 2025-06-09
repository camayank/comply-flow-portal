
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Users, FileText, Shield } from 'lucide-react';

const Onboarding = () => {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    employees: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store data in localStorage for now
    localStorage.setItem('companyData', JSON.stringify(formData));
    setLocation('/business-type');
  };

  const features = [
    {
      icon: Shield,
      title: 'Compliance Engine',
      description: 'Automated compliance monitoring and tracking'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Secure document upload and auto-generation'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Multi-user access with role-based permissions'
    },
    {
      icon: Building2,
      title: 'Enterprise Ready',
      description: 'Scalable solution for businesses of all sizes'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to DigiComply Portal
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your compliance journey with our intelligent automation platform
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Quick Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Start Company Incorporation */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setLocation('/business-type')}>
              <CardHeader className="text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <CardTitle className="text-xl">Start Company Incorporation</CardTitle>
                <CardDescription>
                  Complete end-to-end company incorporation with guided setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Business type selection</li>
                  <li>• Package and pricing options</li>
                  <li>• Legal documentation</li>
                  <li>• Government registrations</li>
                </ul>
                <Button className="w-full mt-4">
                  Start Incorporation Process
                </Button>
              </CardContent>
            </Card>

            {/* Individual Services */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setLocation('/service-selection')}>
              <CardHeader className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <CardTitle className="text-xl">Individual Compliance Services</CardTitle>
                <CardDescription>
                  Handle specific compliance requirements and filings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• ROC annual filings</li>
                  <li>• Tax return submissions</li>
                  <li>• Certification services</li>
                  <li>• Ongoing compliance</li>
                </ul>
                <Button variant="outline" className="w-full mt-4">
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Alternative: Company Information Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                Or Tell Us About Your Company
              </CardTitle>
              <CardDescription>
                Provide basic information to get personalized recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter your company name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="e.g., Healthcare, Finance, Technology"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="employees">Number of Employees</Label>
                  <Input
                    id="employees"
                    name="employees"
                    value={formData.employees}
                    onChange={handleInputChange}
                    placeholder="e.g., 50-100"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of your business operations"
                    rows={3}
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  Continue to Services
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features Overview */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              What you'll get with DigiComply
            </h2>
            
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <feature.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Progress Indicator */}
            <Card className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <h3 className="font-semibold mb-2">Your Compliance Journey</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Stage 0: Onboarding</span>
                <span>1 of 5 stages</span>
              </div>
              <div className="w-full bg-blue-500 rounded-full h-2 mt-2">
                <div className="bg-white rounded-full h-2 w-1/5 transition-all duration-300"></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
