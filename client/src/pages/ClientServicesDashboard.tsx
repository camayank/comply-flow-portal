/**
 * CLIENT SERVICES DASHBOARD
 *
 * Comprehensive dashboard for clients to:
 * - View all their active services (from 96+ catalog)
 * - Track progress with visual timeline
 * - See upcoming deadlines
 * - View activity history
 * - Request new services
 *
 * Transparent delivery - client sees exactly where their work stands
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  TrendingUp,
  Activity,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Building2,
  RefreshCw,
  Bell,
  Eye,
  Download,
  Upload
} from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";

// Types
interface ServiceRequest {
  id: number;
  serviceType: string;
  status: string;
  priority: string;
  periodLabel?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  entityName?: string;
  slaStatus?: string;
  progress?: number;
}

interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  inProgress: number;
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = () => {
    const statusLower = status?.toLowerCase() || '';

    if (['completed', 'delivered'].includes(statusLower)) {
      return { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Completed" };
    }
    if (['in_progress', 'in progress', 'processing'].includes(statusLower)) {
      return { color: "bg-blue-100 text-blue-800", icon: Activity, label: "In Progress" };
    }
    if (['docs_pending', 'pending_documents', 'documents required'].includes(statusLower)) {
      return { color: "bg-orange-100 text-orange-800", icon: Upload, label: "Documents Required" };
    }
    if (['qc_review', 'quality_check', 'qc review'].includes(statusLower)) {
      return { color: "bg-purple-100 text-purple-800", icon: Eye, label: "Quality Review" };
    }
    if (['ready_for_delivery', 'ready'].includes(statusLower)) {
      return { color: "bg-teal-100 text-teal-800", icon: Download, label: "Ready for Delivery" };
    }
    if (['initiated', 'created', 'new'].includes(statusLower)) {
      return { color: "bg-gray-100 text-gray-800", icon: Clock, label: "Request Received" };
    }
    if (['cancelled', 'rejected'].includes(statusLower)) {
      return { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "Cancelled" };
    }

    return { color: "bg-gray-100 text-gray-800", icon: Clock, label: status };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// Service Progress Component
function ServiceProgress({ request }: { request: ServiceRequest }) {
  const stages = [
    { key: 'initiated', label: 'Submitted' },
    { key: 'docs_uploaded', label: 'Documents' },
    { key: 'in_progress', label: 'Processing' },
    { key: 'qc_review', label: 'Review' },
    { key: 'completed', label: 'Completed' }
  ];

  const getCurrentStageIndex = () => {
    const status = request.status?.toLowerCase() || '';
    if (['completed', 'delivered'].includes(status)) return 4;
    if (['qc_review', 'quality_check', 'ready_for_delivery'].includes(status)) return 3;
    if (['in_progress', 'processing', 'govt_submission'].includes(status)) return 2;
    if (['docs_uploaded', 'docs_pending'].includes(status)) return 1;
    return 0;
  };

  const currentIndex = getCurrentStageIndex();
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between">
        {stages.map((stage, index) => (
          <div
            key={stage.key}
            className={`text-xs ${index <= currentIndex ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            {index <= currentIndex ? '●' : '○'}
          </div>
        ))}
      </div>
    </div>
  );
}

// Service Card Component
function ServiceCard({ request, onClick }: { request: ServiceRequest; onClick: () => void }) {
  const isUrgent = request.dueDate && isBefore(new Date(request.dueDate), addDays(new Date(), 3));
  const isOverdue = request.dueDate && isBefore(new Date(request.dueDate), new Date());

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-200 bg-red-50' :
        isUrgent ? 'border-orange-200 bg-orange-50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">{request.serviceType?.replace(/_/g, ' ')}</h3>
            {request.periodLabel && (
              <p className="text-xs text-muted-foreground">{request.periodLabel}</p>
            )}
          </div>
          <StatusBadge status={request.status || ''} />
        </div>

        <ServiceProgress request={request} />

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {request.dueDate ? (
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                Due: {format(new Date(request.dueDate), 'MMM d, yyyy')}
              </span>
            ) : (
              <span>No due date</span>
            )}
          </div>
          <ChevronRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  onClick
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`${bgColor} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

// Deadline Item Component
function DeadlineItem({ request }: { request: ServiceRequest }) {
  const isOverdue = request.dueDate && isBefore(new Date(request.dueDate), new Date());

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-orange-500'}`} />
        <div>
          <p className="font-medium text-sm">{request.serviceType?.replace(/_/g, ' ')}</p>
          <p className="text-xs text-muted-foreground">{request.periodLabel}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
          {request.dueDate && format(new Date(request.dueDate), 'MMM d')}
        </p>
        <p className="text-xs text-muted-foreground">
          {request.dueDate && formatDistanceToNow(new Date(request.dueDate), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: any }) {
  return (
    <div className="flex items-start gap-3 p-3 border-l-2 border-primary/20 ml-2">
      <Activity className="h-4 w-4 text-primary mt-0.5" />
      <div>
        <p className="text-sm">{activity.activityDescription || activity.clientMessage}</p>
        <p className="text-xs text-muted-foreground">
          {activity.occurredAt && formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// Service Request Detail Dialog
function ServiceDetailDialog({ requestId, onClose }: { requestId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/universal/client/service-request/${requestId}`],
    enabled: !!requestId
  });

  if (isLoading) {
    return (
      <DialogContent className="max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DialogContent>
    );
  }

  const { request, workflow, activity } = data || {};

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{request?.serviceType?.replace(/_/g, ' ')}</DialogTitle>
        <DialogDescription>
          {request?.periodLabel} • Request #{request?.id}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Status & Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={request?.status || ''} />
            <span className="text-sm text-muted-foreground">
              {workflow?.completedSteps || 0} of {workflow?.totalSteps || 0} steps
            </span>
          </div>
          <Progress value={workflow?.progress || 0} className="h-3" />
        </div>

        {/* Workflow Steps */}
        <div>
          <h4 className="font-medium mb-3">Progress Timeline</h4>
          <div className="space-y-2">
            {workflow?.statuses?.map((status: any, index: number) => {
              const isCompleted = index < (workflow?.completedSteps || 0);
              const isCurrent = status.statusCode === request?.status;

              return (
                <div
                  key={status.id}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isCurrent ? 'bg-primary/10 border border-primary/20' :
                    isCompleted ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-primary text-white' : 'bg-gray-200'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{status.clientStatusLabel || status.statusName}</p>
                    {status.clientMessage && (
                      <p className="text-xs text-muted-foreground">{status.clientMessage}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {activity && activity.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Recent Updates</h4>
            <div className="space-y-2">
              {activity.slice(0, 5).map((item: any) => (
                <ActivityItem key={item.id} activity={item} />
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <h4 className="font-medium mb-3">Documents</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Deliverables
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

// Main Component
export default function ClientServicesDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['/api/universal/client/dashboard', { entity_id: user?.entityId }],
    enabled: !!user?.entityId
  });

  // Fetch service catalog
  const { data: catalogData } = useQuery({
    queryKey: ['/api/universal/services']
  });

  const { stats, requests, upcomingDeadlines, recentActivity, entity } = dashboardData || {};

  // Filter requests based on tab and search
  const filteredRequests = (requests || []).filter((req: ServiceRequest) => {
    const matchesSearch = !searchQuery ||
      req.serviceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.periodLabel?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && !['completed', 'cancelled'].includes(req.status?.toLowerCase() || '')) ||
      (activeTab === "completed" && req.status?.toLowerCase() === 'completed') ||
      (activeTab === "pending" && ['initiated', 'docs_pending'].includes(req.status?.toLowerCase() || ''));

    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Services</h1>
          <p className="text-muted-foreground">
            {entity?.name || 'Welcome'} • Track all your compliance services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/services">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Service Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Services"
          value={stats?.total || 0}
          icon={FileText}
          color="text-gray-900"
          bgColor="bg-gray-50"
          onClick={() => setActiveTab("all")}
        />
        <StatsCard
          title="Active"
          value={stats?.active || 0}
          icon={Activity}
          color="text-blue-600"
          bgColor="bg-blue-50"
          onClick={() => setActiveTab("active")}
        />
        <StatsCard
          title="In Progress"
          value={stats?.inProgress || 0}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50"
          onClick={() => setActiveTab("active")}
        />
        <StatsCard
          title="Pending Action"
          value={stats?.pending || 0}
          icon={Clock}
          color="text-orange-600"
          bgColor="bg-orange-50"
          onClick={() => setActiveTab("pending")}
        />
        <StatsCard
          title="Completed"
          value={stats?.completed || 0}
          icon={CheckCircle2}
          color="text-green-600"
          bgColor="bg-green-50"
          onClick={() => setActiveTab("completed")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Service List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">All ({requests?.length || 0})</TabsTrigger>
                    <TabsTrigger value="active">Active ({stats?.active || 0})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({stats?.pending || 0})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({stats?.completed || 0})</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Service Cards Grid */}
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium">No services found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? 'Try a different search term' : 'Get started by requesting a new service'}
                  </p>
                  <Link href="/services">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Services
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRequests.map((request: ServiceRequest) => (
                    <Dialog key={request.id}>
                      <DialogTrigger asChild>
                        <div>
                          <ServiceCard
                            request={request}
                            onClick={() => setSelectedRequest(request.id)}
                          />
                        </div>
                      </DialogTrigger>
                      <ServiceDetailDialog
                        requestId={request.id}
                        onClose={() => setSelectedRequest(null)}
                      />
                    </Dialog>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Deadlines & Activity */}
        <div className="space-y-4">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
                <div className="space-y-2">
                  {upcomingDeadlines.slice(0, 5).map((item: any) => (
                    <DeadlineItem key={item.id} request={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming deadlines
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-1">
                  {recentActivity.slice(0, 5).map((item: any) => (
                    <ActivityItem key={item.id} activity={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/services" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Request New Service
                </Button>
              </Link>
              <Link href="/documents" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </Link>
              <Link href="/compliance-calendar" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Compliance Calendar
                </Button>
              </Link>
              <Link href="/support" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
