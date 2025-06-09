
import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Mail, Calendar, ArrowRight } from 'lucide-react';

const Confirmation = () => {
  const [, setLocation] = useLocation();

  const completedServices = [
    { name: 'INC-20A Filing', status: 'Submitted', date: '2024-06-08' },
    { name: 'Document Upload', status: 'Verified', date: '2024-06-08' },
    { name: 'Compliance Setup', status: 'Configured', date: '2024-06-08' }
  ];

  const nextSteps = [
    'Email confirmation will be sent within 24 hours',
    'Compliance certificates will be generated',
    'Ongoing monitoring will begin automatically',
    'You will receive deadline reminders'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Compliance Setup Complete!
          </h1>
          <p className="text-lg text-gray-600">
            Your DigiComply portal has been successfully configured
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-green-600 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Stage 4: Process Complete</h3>
            <span>5 of 5 stages</span>
          </div>
          <div className="w-full bg-green-500 rounded-full h-2">
            <div className="bg-white rounded-full h-2 w-full transition-all duration-300"></div>
          </div>
        </Card>

        <div className="max-w-4xl mx-auto">
          {/* Completion Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Process Summary
              </CardTitle>
              <CardDescription>
                Here's what we've completed for your compliance setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-600">{service.status}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {service.date}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  What Happens Next
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-sm text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Setup Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Confirmation
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Consultation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Need Support?</h3>
              <p className="text-gray-600 mb-4">
                Our compliance experts are here to help you every step of the way
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setLocation('/')}>
                  Return to Dashboard
                </Button>
                <Button variant="outline">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
