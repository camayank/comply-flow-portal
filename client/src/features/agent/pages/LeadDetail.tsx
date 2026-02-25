import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Truck,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout, PageShell } from '@/layouts';
import { useAuth } from '@/hooks/useAuth';
import { AGENT_NAVIGATION } from '@/config/agent-navigation';

interface LeadLifecycle {
  lead: {
    id: number;
    status: string;
    createdAt: string | null;
    convertedAt: string | null;
    clientName: string;
  };
  serviceRequest: {
    id: number;
    requestId: string | null;
    status: string | null;
    progress: number;
    serviceName: string;
    serviceId: string;
    createdAt: string | null;
  } | null;
  tasks: {
    total: number;
    completed: number;
    currentStep: string | null;
    currentStepNumber: number | null;
  };
  qcStatus: 'pending' | 'approved' | 'rejected' | null;
  deliveryStatus: 'pending' | 'delivered' | 'confirmed' | null;
}

interface Lead {
  id: number;
  leadId: string;
  clientName: string;
  contactEmail: string | null;
  contactPhone: string;
  serviceInterested: string;
  leadSource: string;
  leadStage: string;
  status: string;
  notes: string | null;
  remarks: string | null;
  createdAt: string;
  convertedAt: string | null;
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const agentUser = user ? {
    name: user.email || 'Agent User',
    email: user.email || '',
  } : undefined;

  // Fetch lead details
  const { data: leadData, isLoading: leadLoading } = useQuery<{ lead: Lead }>({
    queryKey: [`/api/agent/leads/${id}`],
    enabled: !!id,
  });

  // Fetch lifecycle data
  const { data: lifecycle, isLoading: lifecycleLoading } = useQuery<LeadLifecycle>({
    queryKey: [`/api/agent/leads/${id}/lifecycle`],
    enabled: !!id,
  });

  const lead = (leadData as any)?.lead || leadData;
  const isConverted = lead?.leadStage === 'converted' || lead?.status === 'converted';

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'converted':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'hot_lead':
        return 'bg-red-100 text-red-800';
      case 'warm_lead':
        return 'bg-orange-100 text-orange-800';
      case 'cold_lead':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQcStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pending Review</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getDeliveryStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Client Confirmed</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-800"><Truck className="h-3 w-3 mr-1" /> Delivered</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="outline">Awaiting</Badge>;
    }
  };

  if (leadLoading) {
    return (
      <DashboardLayout
        navigation={AGENT_NAVIGATION}
        user={agentUser}
        logo={
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-slate-900">Agent</span>
          </div>
        }
      >
        <PageShell
          title="Lead Details"
          breadcrumbs={[
            { label: "Agent Portal", href: "/agent" },
            { label: "Leads", href: "/agent/leads" },
            { label: "Details" },
          ]}
        >
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout
        navigation={AGENT_NAVIGATION}
        user={agentUser}
        logo={
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-slate-900">Agent</span>
          </div>
        }
      >
        <PageShell
          title="Lead Not Found"
          breadcrumbs={[
            { label: "Agent Portal", href: "/agent" },
            { label: "Leads", href: "/agent/leads" },
          ]}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Lead not found or you don't have access to view it.</p>
                <Link href="/agent/leads">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Leads
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      navigation={AGENT_NAVIGATION}
      user={agentUser}
      logo={
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">Agent</span>
        </div>
      }
    >
      <PageShell
        title={lead.clientName || 'Lead Details'}
        subtitle={lead.leadId}
        breadcrumbs={[
          { label: "Agent Portal", href: "/agent" },
          { label: "Leads", href: "/agent/leads" },
          { label: lead.clientName || 'Details' },
        ]}
        actions={
          <Link href="/agent/leads">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
        }
      >
        <div className="space-y-6">
          {/* Lead Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {lead.clientName}
                  </CardTitle>
                  <CardDescription>{lead.serviceInterested}</CardDescription>
                </div>
                <Badge className={getStatusColor(lead.leadStage || lead.status)}>
                  {(lead.leadStage || lead.status)?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{lead.contactPhone}</span>
                </div>
                {lead.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{lead.contactEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>Source: {lead.leadSource}</span>
                </div>
              </div>
              {(lead.notes || lead.remarks) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  {lead.notes || lead.remarks}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lifecycle Section - Only show for converted leads */}
          {isConverted && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Your lead is now a client!
                </CardTitle>
                <CardDescription>
                  Track the progress of their service request below
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lifecycleLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : lifecycle?.serviceRequest ? (
                  <div className="space-y-6">
                    {/* Service Progress */}
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {lifecycle.serviceRequest.serviceName}
                        </h4>
                        <Badge variant="outline">
                          {lifecycle.serviceRequest.requestId}
                        </Badge>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{lifecycle.serviceRequest.progress}%</span>
                        </div>
                        <Progress value={lifecycle.serviceRequest.progress} className="h-2" />
                      </div>
                      {lifecycle.tasks.total > 0 && (
                        <p className="text-sm text-gray-600">
                          Step {lifecycle.tasks.completed + 1} of {lifecycle.tasks.total}
                          {lifecycle.tasks.currentStep && `: ${lifecycle.tasks.currentStep}`}
                        </p>
                      )}
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Task Progress */}
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-2">
                          <FileCheck className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Tasks</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {lifecycle.tasks.completed}/{lifecycle.tasks.total}
                        </p>
                        <p className="text-xs text-gray-500">completed</p>
                      </div>

                      {/* QC Status */}
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">QC Review</span>
                        </div>
                        {getQcStatusBadge(lifecycle.qcStatus)}
                      </div>

                      {/* Delivery Status */}
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Delivery</span>
                        </div>
                        {getDeliveryStatusBadge(lifecycle.deliveryStatus)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Service request is being processed.</p>
                    <p className="text-sm">Check back soon for updates.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline - For non-converted leads */}
          {!isConverted && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Status</CardTitle>
                <CardDescription>
                  Continue nurturing this lead to conversion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>
                    Created on {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
