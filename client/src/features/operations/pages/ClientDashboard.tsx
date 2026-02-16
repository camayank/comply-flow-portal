import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Building2,
  FileText,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Mail,
  Phone,
} from 'lucide-react';
import { WorkItemsTable } from '../components/WorkItemsTable';
import { UnifiedTimeline } from '../components/UnifiedTimeline';

export default function ClientDashboard() {
  const [, params] = useRoute('/ops/client/:clientId');
  const clientId = params?.clientId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ops-client', clientId],
    queryFn: () => apiRequest('GET', `/api/ops/clients/${clientId}`),
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-semibold">Client Not Found</h2>
          <Link href="/operations/work-queue">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Queue
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { client, lead, workItems, timeline, stats } = data;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 -mx-4 -mt-4 px-4 lg:-mx-6 lg:px-6 mb-6">
        <div className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/operations/work-queue">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h1 className="text-xl font-bold">{client.name}</h1>
                  <Badge variant="outline" className="font-mono">
                    {client.clientId}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  {client.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.contactEmail}
                    </span>
                  )}
                  {client.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.contactPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Edit Client
              </Button>
              <Button size="sm">
                New Service Request
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Cases</p>
                <p className="text-2xl font-bold">{stats.totalCases}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-blue-600">{stats.activeCases}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedCases}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Attribution */}
      {lead && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Lead Attribution</p>
                  <p className="text-xs text-blue-600">
                    Source: {lead.leadSource} • Lead ID: {lead.leadId}
                    {lead.convertedAt && ` • Converted: ${new Date(lead.convertedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700">
                {lead.leadStage || 'Converted'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <Tabs defaultValue="cases">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="cases">
                Work Items ({workItems.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="documents">
                Documents
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="cases" className="mt-0">
              <WorkItemsTable items={workItems} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <UnifiedTimeline activities={timeline} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Documents view coming soon</p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </DashboardLayout>
  );
}
