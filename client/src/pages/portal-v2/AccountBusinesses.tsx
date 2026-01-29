import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, MapPin, Phone, Mail, ExternalLink, Home, Settings } from 'lucide-react';

export default function AccountBusinesses() {
  const [businesses] = useState([
    {
      id: 1,
      name: 'Demo Business Pvt Ltd',
      type: 'Private Limited',
      gstin: '29AABCD1234E1Z5',
      address: '123 MG Road, Bangalore, Karnataka - 560001',
      phone: '+91 98765 43210',
      email: 'contact@demobusiness.com',
      status: 'active',
      registrationDate: '2024-03-15'
    }
  ]);

  const navigation = [
    { 
      label: 'Status', 
      href: '/portal-v2', 
      icon: Home,
      description: 'Your compliance status'
    },
    { 
      label: 'Account', 
      href: '/portal-v2/account', 
      icon: Settings,
      description: 'Businesses, billing, documents'
    },
  ];

  return (
    <DashboardLayout
      title="Your Businesses"
      navigation={navigation}
    >
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Businesses</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your registered entities</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Business
          </Button>
        </div>

        {/* Businesses List */}
        {businesses.length > 0 ? (
          <div className="space-y-4">
            {businesses.map((business) => (
              <Card key={business.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{business.name}</CardTitle>
                        <CardDescription>{business.type}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                      {business.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-gray-700">Address</p>
                          <p className="text-gray-600">{business.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ExternalLink className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-gray-700">GSTIN</p>
                          <p className="text-gray-600 font-mono">{business.gstin}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-gray-700">Phone</p>
                          <p className="text-gray-600">{business.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-gray-700">Email</p>
                          <p className="text-gray-600">{business.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Compliance Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No businesses yet</h3>
              <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                Add your first business to start managing compliance, filings, and documents in one place.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Business
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
