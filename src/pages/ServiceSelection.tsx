
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Shield, FileText, Calendar, Star, Zap, TrendingUp } from 'lucide-react';

const ServiceSelection = () => {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const mandatoryServices = [
    {
      id: 'inc-20a',
      title: 'INC-20A Filing',
      description: 'Mandatory filing within 180 days of incorporation',
      deadline: '15 days left',
      penalty: '₹50,000',
      price: '₹2,999',
      originalPrice: '₹4,999',
      urgency: 'high',
      category: 'mandatory',
      features: ['ROC Filing', 'Expert Review', 'Penalty Protection'],
      conversionRate: '45%'
    },
    {
      id: 'adt-1',
      title: 'ADT-1 Compliance',
      description: 'Director details filing required within 30 days',
      deadline: '8 days left',
      penalty: '₹25,000',
      price: '₹1,999',
      originalPrice: '₹2,999',
      urgency: 'high',
      category: 'mandatory',
      features: ['Director KYC', 'DIN Verification', 'Auto Reminders'],
      conversionRate: '52%'
    },
    {
      id: 'gst-registration',
      title: 'GST Registration',
      description: 'Required for businesses with ₹20L+ turnover',
      deadline: 'Within 30 days of threshold',
      penalty: 'Business closure risk',
      price: '₹3,999',
      originalPrice: '₹5,999',
      urgency: 'medium',
      category: 'mandatory',
      features: ['GSTIN Certificate', 'HSN Classification', '24/7 Support'],
      conversionRate: '64%'
    }
  ];

  const addOnServices = [
    {
      id: 'trademark',
      title: 'Trademark Registration',
      description: 'Protect your brand identity',
      price: '₹8,999',
      originalPrice: '₹12,999',
      urgency: 'low',
      category: 'addon',
      features: ['Brand Protection', 'Logo Registration', '10-year Validity'],
      conversionRate: '36%',
      savings: 'Save ₹4,000'
    },
    {
      id: 'iso-certification',
      title: 'ISO 9001:2015 Certification',
      description: 'Quality management system certification',
      price: '₹24,999',
      originalPrice: '₹35,999',
      urgency: 'low',
      category: 'addon',
      features: ['International Recognition', 'Quality Audit', 'Certificate'],
      conversionRate: '28%',
      savings: 'Save ₹11,000'
    },
    {
      id: 'tax-consultation',
      title: 'Tax Optimization Consultation',
      description: 'Save ₹1.2L+ annually with expert tax planning',
      price: '₹9,999',
      originalPrice: '₹15,999',
      urgency: 'medium',
      category: 'addon',
      features: ['Annual Tax Planning', 'Expert CA Consultation', 'Savings Report'],
      conversionRate: '42%',
      savings: 'Annual savings up to ₹1.2L'
    },
    {
      id: 'fssai-license',
      title: 'FSSAI License',
      description: 'Mandatory for food business operations',
      price: '₹4,999',
      originalPrice: '₹7,999',
      urgency: 'high',
      category: 'addon',
      features: ['Food License', 'Health Compliance', 'Audit Support'],
      conversionRate: '64%',
      savings: 'Industry mandatory'
    }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getTotalPrice = () => {
    const allServices = [...mandatoryServices, ...addOnServices];
    return selectedServices.reduce((total, serviceId) => {
      const service = allServices.find(s => s.id === serviceId);
      return total + (service ? parseInt(service.price.replace(/[₹,]/g, '')) : 0);
    }, 0);
  };

  const handleContinue = () => {
    navigate('/documents');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Select Your Compliance Services
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered recommendations based on your company profile
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Stage 2: Service Selection</h3>
            <span>2 of 5 stages</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-2/5 transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="recommended" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recommended" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                AI Recommended
              </TabsTrigger>
              <TabsTrigger value="mandatory" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Mandatory
              </TabsTrigger>
              <TabsTrigger value="addons" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Growth Add-ons
              </TabsTrigger>
            </TabsList>

            {/* AI Recommended Tab */}
            <TabsContent value="recommended" className="space-y-6">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    Urgent Actions Required
                  </CardTitle>
                  <CardDescription>
                    Based on your company profile, these services need immediate attention
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...mandatoryServices.filter(s => s.urgency === 'high'), ...addOnServices.filter(s => s.urgency === 'high')].map((service) => (
                  <Card key={service.id} className="relative hover:shadow-lg transition-shadow border-red-200">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={`${getUrgencyColor(service.urgency)} flex items-center gap-1`}>
                          {getUrgencyIcon(service.urgency)}
                          URGENT
                        </Badge>
                        {service.conversionRate && (
                          <Badge variant="secondary" className="text-xs">
                            {service.conversionRate} convert
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {service.deadline && (
                          <div className="flex items-center gap-2 text-red-600">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm font-medium">{service.deadline}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-600">{service.price}</span>
                          {service.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">{service.originalPrice}</span>
                          )}
                        </div>

                        <ul className="text-sm text-gray-600 space-y-1">
                          {service.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button 
                          onClick={() => toggleService(service.id)}
                          className={`w-full ${selectedServices.includes(service.id) ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          {selectedServices.includes(service.id) ? 'Selected ✓' : 'Select Service'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Mandatory Tab */}
            <TabsContent value="mandatory" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mandatoryServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={getUrgencyColor(service.urgency)}>
                          {service.urgency.toUpperCase()}
                        </Badge>
                        <Badge variant="destructive">MANDATORY</Badge>
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Penalty: {service.penalty}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-orange-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">{service.deadline}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-600">{service.price}</span>
                          <span className="text-sm text-gray-500 line-through">{service.originalPrice}</span>
                        </div>

                        <ul className="text-sm text-gray-600 space-y-1">
                          {service.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button 
                          onClick={() => toggleService(service.id)}
                          className={`w-full ${selectedServices.includes(service.id) ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          {selectedServices.includes(service.id) ? 'Selected ✓' : 'Select Service'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Add-ons Tab */}
            <TabsContent value="addons" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addOnServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={getUrgencyColor(service.urgency)}>
                          OPTIONAL
                        </Badge>
                        {service.savings && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {service.savings}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-600">{service.price}</span>
                          <span className="text-sm text-gray-500 line-through">{service.originalPrice}</span>
                        </div>

                        <ul className="text-sm text-gray-600 space-y-1">
                          {service.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button 
                          onClick={() => toggleService(service.id)}
                          variant={selectedServices.includes(service.id) ? "default" : "outline"}
                          className={`w-full ${selectedServices.includes(service.id) ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          {selectedServices.includes(service.id) ? 'Selected ✓' : 'Add Service'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Summary and Continue */}
          {selectedServices.length > 0 && (
            <Card className="mt-8 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Selected Services ({selectedServices.length})</h3>
                    <p className="text-sm text-gray-600">Total: ₹{getTotalPrice().toLocaleString()}</p>
                  </div>
                  <Button onClick={handleContinue} size="lg">
                    Continue to Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceSelection;
