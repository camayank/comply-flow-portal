import React, { useState } from 'react';
import { MinimalLayout } from '@/layouts';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Shield } from 'lucide-react';

const PackageSelection = () => {
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState('');

  const packages = [
    {
      id: 'basic',
      title: 'Basic Startup',
      price: '₹4,999',
      originalPrice: '₹8,999',
      description: 'Perfect for new entrepreneurs',
      icon: Zap,
      features: [
        'Company Registration',
        'PAN & TAN Registration',
        'Bank Account Opening Support',
        'Digital Certificate',
        'GST Registration (if applicable)',
        'Basic Compliance Calendar'
      ],
      popular: false,
      savings: 'Save ₹4,000'
    },
    {
      id: 'professional',
      title: 'Professional Growth',
      price: '₹12,999',
      originalPrice: '₹19,999',
      description: 'Complete business setup with growth tools',
      icon: Star,
      features: [
        'Everything in Basic',
        'Trademark Registration',
        'FSSAI License (if applicable)',
        'MSME Registration',
        'Website Development',
        'Digital Marketing Setup',
        'Accounting Software Setup',
        'Tax Planning Consultation'
      ],
      popular: true,
      savings: 'Save ₹7,000'
    },
    {
      id: 'enterprise',
      title: 'Enterprise Plus',
      price: '₹24,999',
      originalPrice: '₹35,999',
      description: 'Premium package for serious businesses',
      icon: Shield,
      features: [
        'Everything in Professional',
        'ISO 9001:2015 Certification',
        'Advanced Tax Optimization',
        'Legal Documentation Suite',
        'Priority CA Support',
        'Quarterly Business Reviews',
        'Export-Import License',
        'International Business Setup'
      ],
      popular: false,
      savings: 'Save ₹11,000'
    }
  ];

  const addons = [
    { id: 'trademark', name: 'Additional Trademark', price: '₹6,999' },
    { id: 'gst-filing', name: 'GST Filing (Annual)', price: '₹3,999' },
    { id: 'audit', name: 'Annual Audit', price: '₹15,999' },
    { id: 'roc-filing', name: 'ROC Annual Filing', price: '₹4,999' }
  ];

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
    const packagePrice = selectedPkg ? parseInt(selectedPkg.price.replace('₹', '').replace(',', '')) : 0;
    const addonTotal = selectedAddons.reduce((total, addonId) => {
      const addon = addons.find(a => a.id === addonId);
      return total + (addon ? parseInt(addon.price.replace('₹', '').replace(',', '')) : 0);
    }, 0);
    return packagePrice + addonTotal;
  };

  const handleContinue = () => {
    if (selectedPackage) {
      localStorage.setItem('selectedPackage', JSON.stringify({
        package: selectedPackage,
        addons: selectedAddons,
        total: calculateTotal()
      }));
      setLocation('/founder-details');
    }
  };

  return (
    <MinimalLayout>
      <div className="bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Choose Your Package
          </h1>
          <p className="text-lg text-gray-600">
            Select the package that best suits your business needs
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Step 2: Package Selection</h3>
            <span>2 of 8 steps</span>
          </div>
          <div className="w-full bg-purple-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-1/4 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-7xl mx-auto">
          {/* Package Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = selectedPackage === pkg.id;
              
              return (
                <Card 
                  key={pkg.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg relative ${
                    isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                  } ${pkg.popular ? 'border-orange-300 scale-105' : ''}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-orange-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <Icon className={`h-12 w-12 mx-auto mb-4 ${isSelected ? 'text-purple-600' : 'text-gray-600'}`} />
                    <CardTitle className="text-xl">{pkg.title}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
                        <span className="text-lg text-gray-500 line-through">{pkg.originalPrice}</span>
                      </div>
                      <p className="text-green-600 font-medium text-sm mt-1">{pkg.savings}</p>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Add-ons Section */}
          {selectedPackage && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Optional Add-ons</CardTitle>
                <CardDescription>Enhance your package with additional services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {addons.map((addon) => (
                    <div 
                      key={addon.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAddons.includes(addon.id) 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAddonToggle(addon.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{addon.name}</h4>
                          <p className="text-sm text-gray-600">{addon.price}</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 ${
                          selectedAddons.includes(addon.id)
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedAddons.includes(addon.id) && (
                            <Check className="h-3 w-3 text-white m-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total and Continue */}
          {selectedPackage && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Package Summary</h3>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">₹{calculateTotal().toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Amount</p>
                </div>
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={handleContinue}
                  size="lg"
                  className="px-8 py-3"
                >
                  Continue to Founder Details
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </MinimalLayout>
  );
};

export default PackageSelection;