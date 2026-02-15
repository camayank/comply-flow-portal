import { DashboardLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, Home, Settings, Calendar, Receipt } from 'lucide-react';

export default function AccountBilling() {
  const invoices = [
    {
      id: 'INV-2026-001',
      date: '2026-01-15',
      amount: 5000,
      status: 'paid',
      description: 'GST Filing - December 2025',
      dueDate: '2026-01-20'
    },
    {
      id: 'INV-2025-012',
      date: '2025-12-15',
      amount: 5000,
      status: 'paid',
      description: 'GST Filing - November 2025',
      dueDate: '2025-12-20'
    }
  ];

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
      title="Billing & Invoices"
      navigation={navigation}
    >
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-600 mt-1">View payment history and download receipts</p>
        </div>

        {/* Payment Method Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage how you pay for services</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Bank Transfer / UPI</p>
                <p className="text-sm text-gray-600">Pay via bank transfer or UPI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Download receipts and view payment details</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Receipt className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{invoice.id}</p>
                        <p className="text-sm text-gray-600">{invoice.description}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(invoice.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{invoice.amount.toLocaleString()}</p>
                        <Badge 
                          variant="default" 
                          className={invoice.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-sm text-gray-600 text-center max-w-md">
                  Your payment history and invoices will appear here once you start using our services.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
