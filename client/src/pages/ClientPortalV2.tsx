import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import ComplianceStatusCard from '@/components/portal-v2/ComplianceStatusCard';
import NextActionCard from '@/components/portal-v2/NextActionCard';
import CollapsibleSection from '@/components/portal-v2/CollapsibleSection';
import RecentActivityList from '@/components/portal-v2/RecentActivityList';
import ActionDetailPage from '@/components/portal-v2/ActionDetailPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Settings, Calendar, FileText, Bell, HelpCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface ClientStatusData {
  complianceState: 'GREEN' | 'AMBER' | 'RED';
  daysSafe: number;
  nextDeadline?: string;
  penaltyExposure?: number;
  nextAction: {
    id: string;
    title: string;
    timeEstimate: string;
    whyMatters: {
      benefits: string[];
      socialProof: string;
    };
    actionType: 'upload' | 'review' | 'confirm' | 'pay';
    instructions?: string[];
    documentType?: string;
    dueDate?: string;
  } | null;
  recentActivities: Array<{
    id: string;
    type: 'document_uploaded' | 'filing_initiated' | 'payment_completed' | 'document_approved' | 'alert_created';
    description: string;
    timestamp: string;
    icon?: string;
  }>;
}

export default function ClientPortalV2() {
  const [showActionDetail, setShowActionDetail] = useState(false);

  // Single API call - backend aggregates everything
  const statusQuery = useStandardQuery<ClientStatusData>({
    queryKey: ['/api/v2/client/status'],
    queryFn: async () => {
      const response = await fetch('/api/v2/client/status', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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

  const upcomingDeadlines = [
    { title: 'GST Filing - January 2026', date: 'Feb 5, 2026', daysLeft: 12, priority: 'high' },
    { title: 'TDS Return - Q3 FY 2025-26', date: 'Feb 15, 2026', daysLeft: 22, priority: 'medium' },
    { title: 'Professional Tax - Q4', date: 'Mar 31, 2026', daysLeft: 66, priority: 'low' },
  ];

  const quickStats = [
    { label: 'Tasks Completed', value: '23', change: '+5 this month', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Actions', value: '2', change: 'Due soon', icon: Clock, color: 'text-amber-600' },
    { label: 'Days Safe', value: '12', change: 'Until next deadline', icon: TrendingUp, color: 'text-blue-600' },
  ];

  return (
    <DashboardLayout
      title="Your Business"
      navigation={navigation}
    >
      {statusQuery.render((data) => (
        <div className="max-w-3xl mx-auto space-y-6 px-4 py-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PRIMARY: Status (always visible) */}
          <ComplianceStatusCard
            state={data.complianceState}
            daysSafe={data.daysSafe}
            nextDeadline={data.nextDeadline}
            penaltyExposure={data.penaltyExposure}
          />

          {/* SECONDARY: Next Action (always visible) */}
          <NextActionCard
            action={data.nextAction}
            onActionClick={() => setShowActionDetail(true)}
          />

          {/* Upcoming Deadlines */}
          <CollapsibleSection
            title="Upcoming deadlines"
            defaultOpen={true}
            count={upcomingDeadlines.length}
          >
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{deadline.title}</p>
                      <p className="text-sm text-gray-600">{deadline.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{deadline.daysLeft} days</span>
                    <Badge 
                      variant="default" 
                      className={
                        deadline.priority === 'high' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                        deadline.priority === 'medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                        'bg-gray-100 text-gray-700 hover:bg-gray-100'
                      }
                    >
                      {deadline.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* TERTIARY: Collapsed by default */}
          <CollapsibleSection
            title="Recent activity"
            defaultOpen={false}
            count={data.recentActivities.length}
          >
            <RecentActivityList activities={data.recentActivities} />
          </CollapsibleSection>

          {/* Quick Actions */}
          <CollapsibleSection
            title="Quick actions"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start h-auto py-4">
                <FileText className="h-5 w-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Upload documents</p>
                  <p className="text-xs text-gray-600">Add new files</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4">
                <Calendar className="h-5 w-5 mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">View calendar</p>
                  <p className="text-xs text-gray-600">See all deadlines</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4">
                <Bell className="h-5 w-5 mr-3 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-gray-600">Manage alerts</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4">
                <HelpCircle className="h-5 w-5 mr-3 text-orange-600" />
                <div className="text-left">
                  <p className="font-medium">Get help</p>
                  <p className="text-xs text-gray-600">Contact support</p>
                </div>
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Account"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <a
                href="/portal-v2/account/businesses"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Businesses</p>
                <p className="text-sm text-gray-600">Manage your entities</p>
              </a>
              <a
                href="/portal-v2/account/billing"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Billing & invoices</p>
                <p className="text-sm text-gray-600">Payment history and receipts</p>
              </a>
              <a
                href="/portal-v2/account/documents"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Documents</p>
                <p className="text-sm text-gray-600">View all uploaded files</p>
              </a>
              <a
                href="/portal-v2/account/security"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Security</p>
                <p className="text-sm text-gray-600">Password and 2FA settings</p>
              </a>
            </div>
          </CollapsibleSection>
        </div>
      ))}

      {/* Action Detail Modal */}
      {statusQuery.data?.nextAction && (
        <ActionDetailPage
          action={statusQuery.data.nextAction}
          isOpen={showActionDetail}
          onClose={() => setShowActionDetail(false)}
          onComplete={() => {
            statusQuery.refetch();
            setShowActionDetail(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
