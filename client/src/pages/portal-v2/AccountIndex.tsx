import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Receipt, FileText, Shield, Home, Settings, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export default function AccountIndex() {
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

  const accountSections = [
    {
      title: 'Businesses',
      description: 'Manage your registered entities and business information',
      icon: Building2,
      href: '/portal-v2/account/businesses',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Billing & Invoices',
      description: 'View payment history and download receipts',
      icon: Receipt,
      href: '/portal-v2/account/billing',
      color: 'bg-green-50 text-green-600'
    },
    {
      title: 'Documents',
      description: 'View and manage all uploaded files',
      icon: FileText,
      href: '/portal-v2/account/documents',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      title: 'Security',
      description: 'Password and 2FA settings',
      icon: Shield,
      href: '/portal-v2/account/security',
      color: 'bg-amber-50 text-amber-600'
    }
  ];

  return (
    <DashboardLayout
      title="Account"
      navigation={navigation}
    >
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your profile, businesses, and preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accountSections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg ${section.color}`}>
                        <section.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-sm text-gray-600">Business</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-sm text-gray-600">Invoices</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-600">Documents</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">✓</p>
                <p className="text-sm text-gray-600">Secure</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
