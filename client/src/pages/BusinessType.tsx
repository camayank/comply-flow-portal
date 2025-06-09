import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Store, Briefcase, Factory, Truck } from 'lucide-react';

const BusinessType = () => {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState('');

  const businessTypes = [
    {
      id: 'private-limited',
      title: 'Private Limited Company',
      description: 'Best for startups and growing businesses',
      icon: Building2,
      features: ['Limited Liability', 'Professional Credibility', 'Easy Fund Raising'],
      recommended: true
    },
    {
      id: 'llp',
      title: 'Limited Liability Partnership',
      description: 'Perfect for professional services',
      icon: Users,
      features: ['Partner Flexibility', 'Tax Benefits', 'Limited Compliance'],
      recommended: false
    },
    {
      id: 'sole-proprietorship',
      title: 'Sole Proprietorship',
      description: 'Simple structure for individual businesses',
      icon: Store,
      features: ['Easy Setup', 'Full Control', 'Minimal Compliance'],
      recommended: false
    },
    {
      id: 'partnership',
      title: 'Partnership Firm',
      description: 'Traditional business partnership',
      icon: Briefcase,
      features: ['Shared Resources', 'Joint Liability', 'Simple Formation'],
      recommended: false
    },
    {
      id: 'opc',
      title: 'One Person Company',
      description: 'Corporate structure for solo entrepreneurs',
      icon: Factory,
      features: ['Single Owner', 'Corporate Benefits', 'Limited Liability'],
      recommended: false
    },
    {
      id: 'ngo',
      title: 'Non-Profit Organization',
      description: 'For social and charitable causes',
      icon: Truck,
      features: ['Tax Exemptions', 'Social Impact', 'Grant Eligibility'],
      recommended: false
    }
  ];

  const handleContinue = () => {
    if (selectedType) {
      localStorage.setItem('businessType', selectedType);
      setLocation('/package-selection');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Choose Your Business Type
          </h1>
          <p className="text-lg text-gray-600">
            Select the business structure that best fits your needs
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Step 1: Business Type Selection</h3>
            <span>1 of 8 steps</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-1/8 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-6xl mx-auto">
          {/* Business Type Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {businessTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  } ${type.recommended ? 'border-orange-200 bg-orange-50' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      {type.recommended && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {type.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button 
              onClick={handleContinue}
              disabled={!selectedType}
              size="lg"
              className="px-8 py-3"
            >
              Continue to Package Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessType;