
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const ServiceSelection = () => {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const services = [
    {
      id: 'inc-20a',
      title: 'INC-20A Upsells',
      description: 'Annual filing compliance for company incorporation',
      price: '$299',
      urgency: 'high',
      deadline: '15 days',
      features: ['Automated filing', 'Deadline tracking', 'Email notifications']
    },
    {
      id: 'adt-1',
      title: 'ADT-1 Upsells',
      description: 'Appointment of auditor compliance filing',
      price: '$199',
      urgency: 'medium',
      deadline: '30 days',
      features: ['Document preparation', 'Filing assistance', 'Compliance tracking']
    },
    {
      id: 'gst-din',
      title: 'GST/DIN Upsells',
      description: 'GST registration and DIN application services',
      price: '$399',
      urgency: 'low',
      deadline: '45 days',
      features: ['GST registration', 'DIN application', 'Tax consultation']
    }
  ];

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleContinue = () => {
    localStorage.setItem('selectedServices', JSON.stringify(selectedServices));
    navigate('/documents');
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Select Compliance Services
          </h1>
          <p className="text-lg text-gray-600">
            Choose the services you need for your compliance requirements
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-green-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Stage 1: Service Selection</h3>
            <span>2 of 5 stages</span>
          </div>
          <div className="w-full bg-green-500 rounded-full h-2 mt-2">
            <div className="bg-white rounded-full h-2 w-2/5 transition-all duration-300"></div>
          </div>
        </Card>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedServices.includes(service.id) 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => handleServiceToggle(service.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                    />
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </div>
                  <Badge className={getUrgencyColor(service.urgency)}>
                    {service.urgency}
                  </Badge>
                </div>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">{service.price}</span>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      {getUrgencyIcon(service.urgency)}
                      <span>Due in {service.deadline}</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-1">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary and Continue */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Selected Services:</span>
                <span className="font-semibold">{selectedServices.length}</span>
              </div>
              
              {selectedServices.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedServices.map(id => {
                    const service = services.find(s => s.id === id);
                    return (
                      <div key={id} className="flex justify-between">
                        <span>{service?.title}</span>
                        <span>{service?.price}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <Button 
                onClick={handleContinue} 
                className="w-full"
                disabled={selectedServices.length === 0}
              >
                Continue to Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceSelection;
