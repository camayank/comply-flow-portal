/**
 * ROLE-BASED DASHBOARD
 *
 * Single dashboard component that renders role-appropriate views.
 * All data comes from the same Core Data Engine ensuring consistency.
 *
 * Roles supported:
 * - CLIENT: Service tracking, compliance status, deadlines
 * - AGENT: Referred clients, commissions, leads
 * - OPS_EXECUTIVE/OPS_LEAD: Work queue, SLA tracking, assignments
 * - QC_REVIEWER: Review queue, quality metrics
 * - FINANCE: Revenue, collections, invoicing
 * - ADMIN/SUPER_ADMIN: Platform-wide metrics, system health
 */

import { useState } from "react";
import { DashboardLayout } from '@/layouts';
import { useQuery } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  RefreshCw,
  Shield,
  Briefcase,
  Star,
  BarChart3,
  Calendar,
  Bell,
  Settings,
  ChevronRight,
  AlertCircle,
  CheckSquare,
  Target,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface ServiceRequest {
  id: number;
  serviceName: string;
  status: string;
  priority: string;
  progress: number;
  dueDate?: string;
  slaStatus?: string;
  clientName?: string;
  assignee?: string;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap: Record<string, any> = {
  Plus: CheckCircle2,
  Upload: FileText,
  Shield: Shield,
  MessageSquare: Bell,
  UserPlus: Users,
  Users: Users,
  DollarSign: DollarSign,
  List: FileText,
  CheckSquare: CheckSquare,
  AlertTriangle: AlertTriangle,
  UserCheck: Users,
  BarChart: BarChart3,
  CheckCircle: CheckCircle2,
  TrendingUp: TrendingUp,
  Ticket: FileText,
  Search: Activity,
  FileText: FileText,
  CreditCard: DollarSign,
  PieChart: BarChart3,
  Settings: Settings,
  GitBranch: Activity,
  BarChart2: BarChart3,
};

// ============================================================================
// STATS CARD COMPONENT
// ============================================================================

function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: any;
  color: string;
  href?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {change && (
              <p className={`text-xs ${
                changeType === "positive" ? "text-green-600" :
                changeType === "negative" ? "text-red-600" :
                "text-muted-foreground"
              }`}>
                {change}
              </p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ============================================================================
// QUICK ACTIONS COMPONENT
// ============================================================================

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const IconComponent = iconMap[action.icon] || Activity;
            return (
              <Link key={action.id} href={action.href}>
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <IconComponent className="h-4 w-4" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SERVICE REQUESTS TABLE
// ============================================================================

function ServiceRequestsTable({
  requests,
  showClient = false,
  showAssignee = false,
  title = "Recent Requests"
}: {
  requests: ServiceRequest[];
  showClient?: boolean;
  showAssignee?: boolean;
  title?: string;
}) {
  const getSlaColor = (slaStatus?: string) => {
    switch (slaStatus) {
      case "on_track": return "bg-green-100 text-green-800";
      case "at_risk": return "bg-yellow-100 text-yellow-800";
      case "warning": return "bg-orange-100 text-orange-800";
      case "breached": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "escalated": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>Service delivery status</CardDescription>
        </div>
        <Link href="/my-services">
          <Button variant="ghost" size="sm">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              {showClient && <TableHead>Client</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              {showAssignee && <TableHead>Assignee</TableHead>}
              <TableHead>SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.slice(0, 5).map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.serviceName}</p>
                    <p className="text-xs text-muted-foreground">#{request.id}</p>
                  </div>
                </TableCell>
                {showClient && (
                  <TableCell>{request.clientName || '-'}</TableCell>
                )}
                <TableCell>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={request.progress} className="w-16 h-2" />
                    <span className="text-xs text-muted-foreground">{request.progress}%</span>
                  </div>
                </TableCell>
                {showAssignee && (
                  <TableCell>{request.assignee || 'Unassigned'}</TableCell>
                )}
                <TableCell>
                  <Badge className={getSlaColor(request.slaStatus)}>
                    {request.slaStatus || 'N/A'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {requests.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active requests</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CLIENT DASHBOARD
// ============================================================================

function ClientDashboard({ data, quickActions }: { data: any; quickActions: QuickAction[] }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome Back!</h1>
          <p className="text-muted-foreground">Your business compliance at a glance</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Shield className="h-4 w-4 mr-2" />
          Compliance Score: {data?.complianceScore || 85}%
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Active Services"
          value={data?.activeServices || 0}
          icon={Activity}
          color="text-blue-600"
          href="/my-services"
        />
        <StatsCard
          title="Pending Actions"
          value={data?.pendingActions || 0}
          icon={Clock}
          color="text-orange-600"
          href="/tasks"
        />
        <StatsCard
          title="Completed This Month"
          value={data?.completedThisMonth || 0}
          change="+12% vs last month"
          changeType="positive"
          icon={CheckCircle2}
          color="text-green-600"
        />
        <StatsCard
          title="Upcoming Deadlines"
          value={data?.upcomingDeadlines || 0}
          icon={Calendar}
          color="text-purple-600"
          href="/lifecycle/compliance"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ServiceRequestsTable
            requests={data?.recentRequests || []}
            title="Your Active Services"
          />
        </div>
        <div className="space-y-6">
          <QuickActions actions={quickActions} />

          {/* Compliance Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">GST Filings</span>
                <Badge className="bg-green-100 text-green-800">On Track</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Income Tax</span>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MCA Filings</span>
                <Badge className="bg-yellow-100 text-yellow-800">Due Soon</Badge>
              </div>
              <Link href="/lifecycle/compliance">
                <Button variant="outline" className="w-full mt-2">
                  View All Compliance
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OPERATIONS DASHBOARD
// ============================================================================

function OperationsDashboard({ data, quickActions }: { data: any; quickActions: QuickAction[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground">Manage service delivery & team performance</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={data?.slaHealth === 'good' ? 'default' : 'destructive'} className="px-4 py-2">
            SLA Compliance: {data?.slaCompliance || 94}%
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Work Queue"
          value={data?.workQueueCount || 0}
          icon={FileText}
          color="text-blue-600"
          href="/operations/work-queue"
        />
        <StatsCard
          title="In Progress"
          value={data?.inProgressCount || 0}
          icon={Activity}
          color="text-purple-600"
        />
        <StatsCard
          title="At Risk"
          value={data?.atRiskCount || 0}
          icon={AlertTriangle}
          color="text-orange-600"
          href="/operations/work-queue?filter=at_risk"
        />
        <StatsCard
          title="Escalations"
          value={data?.escalationCount || 0}
          icon={AlertCircle}
          color="text-red-600"
        />
        <StatsCard
          title="Completed Today"
          value={data?.completedToday || 0}
          change="+5 vs yesterday"
          changeType="positive"
          icon={CheckCircle2}
          color="text-green-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ServiceRequestsTable
            requests={data?.workItems || []}
            showClient
            showAssignee
            title="Work Queue"
          />
        </div>
        <div className="space-y-6">
          <QuickActions actions={quickActions} />

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg. Completion Time</span>
                <span className="font-medium">2.3 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">First Response</span>
                <span className="font-medium">4.2 hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">QC Pass Rate</span>
                <span className="font-medium text-green-600">96%</span>
              </div>
              <Link href="/quality-metrics">
                <Button variant="outline" className="w-full mt-2">
                  View Metrics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function AdminDashboard({ data, quickActions }: { data: any; quickActions: QuickAction[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground">System-wide metrics and health</p>
        </div>
        <Badge variant="outline" className="px-4 py-2 bg-green-50">
          <Activity className="h-4 w-4 mr-2" />
          System Healthy
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatsCard
          title="Total Clients"
          value={data?.totalClients || 0}
          change="+23 this month"
          changeType="positive"
          icon={Users}
          color="text-blue-600"
          href="/admin/clients"
        />
        <StatsCard
          title="Active Services"
          value={data?.activeServices || 0}
          icon={Briefcase}
          color="text-purple-600"
        />
        <StatsCard
          title="Revenue (MTD)"
          value={`₹${((data?.revenue || 0) / 100000).toFixed(1)}L`}
          change="+18% vs last month"
          changeType="positive"
          icon={DollarSign}
          color="text-green-600"
        />
        <StatsCard
          title="Pending Payments"
          value={data?.pendingPayments || 0}
          icon={Clock}
          color="text-orange-600"
        />
        <StatsCard
          title="SLA Compliance"
          value={`${data?.slaCompliance || 94}%`}
          icon={Target}
          color="text-teal-600"
        />
        <StatsCard
          title="Active Staff"
          value={data?.activeStaff || 0}
          icon={Users}
          color="text-indigo-600"
          href="/admin/users"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Requests */}
          <ServiceRequestsTable
            requests={data?.recentRequests || []}
            showClient
            showAssignee
            title="Platform Activity"
          />

          {/* Service Categories Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Categories</CardTitle>
              <CardDescription>Request distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(data?.serviceCategories || [
                  { name: 'Registration', count: 45, active: 12 },
                  { name: 'Taxation', count: 89, active: 23 },
                  { name: 'Compliance', count: 67, active: 18 },
                ]).map((cat: any) => (
                  <div key={cat.name} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{cat.name}</p>
                    <p className="text-2xl font-bold text-primary">{cat.count}</p>
                    <p className="text-xs text-muted-foreground">{cat.active} active</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <QuickActions actions={quickActions} />

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response</span>
                <span className="font-medium">45ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="font-medium text-green-600">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Data Sync</span>
                <Badge className="bg-green-100 text-green-800">In Sync</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AGENT DASHBOARD
// ============================================================================

function AgentDashboard({ data, quickActions }: { data: any; quickActions: QuickAction[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">Track referrals and commissions</p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          <Star className="h-4 w-4 mr-2" />
          Partner Level: {data?.partnerLevel || 'Silver'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Referrals"
          value={data?.totalReferrals || 0}
          icon={Users}
          color="text-blue-600"
          href="/agent/clients"
        />
        <StatsCard
          title="Active Clients"
          value={data?.activeClients || 0}
          icon={Briefcase}
          color="text-purple-600"
        />
        <StatsCard
          title="Pending Commission"
          value={`₹${((data?.pendingCommission || 0) / 1000).toFixed(1)}K`}
          icon={DollarSign}
          color="text-green-600"
          href="/agent/commissions"
        />
        <StatsCard
          title="This Month"
          value={`₹${((data?.monthlyEarnings || 0) / 1000).toFixed(1)}K`}
          change="+25% vs last month"
          changeType="positive"
          icon={TrendingUp}
          color="text-teal-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Referred Clients</CardTitle>
              <CardDescription>Track client status and service activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.clients || []).slice(0, 5).map((client: any, idx: number) => (
                    <TableRow key={client.id || idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        </div>
                      </TableCell>
                      <TableCell>{client.activeServices} active</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">{client.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        ₹{client.commission?.toLocaleString() || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <QuickActions actions={quickActions} />

          {/* Commission Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commission Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Earned</span>
                <span className="font-bold text-green-600">
                  ₹{((data?.totalEarned || 0) / 1000).toFixed(1)}K
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <span className="font-medium">
                  ₹{((data?.pendingCommission || 0) / 1000).toFixed(1)}K
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Commission Rate</span>
                <span className="font-medium">{data?.commissionRate || 15}%</span>
              </div>
              <Link href="/agent/commissions">
                <Button variant="outline" className="w-full mt-2">
                  View Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FINANCE DASHBOARD
// ============================================================================

function FinanceDashboard({ data, quickActions }: { data: any; quickActions: QuickAction[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">Revenue, collections, and financial metrics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Revenue (MTD)"
          value={`₹${((data?.revenue || 0) / 100000).toFixed(1)}L`}
          change="+18% vs last month"
          changeType="positive"
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatsCard
          title="Collections"
          value={`₹${((data?.collections || 0) / 100000).toFixed(1)}L`}
          icon={DollarSign}
          color="text-blue-600"
        />
        <StatsCard
          title="Outstanding"
          value={`₹${((data?.outstanding || 0) / 100000).toFixed(1)}L`}
          icon={Clock}
          color="text-orange-600"
        />
        <StatsCard
          title="Pending Invoices"
          value={data?.pendingInvoices || 0}
          icon={FileText}
          color="text-purple-600"
        />
        <StatsCard
          title="Collection Rate"
          value={`${data?.collectionRate || 92}%`}
          icon={Target}
          color="text-teal-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Payment and invoice activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.transactions || []).slice(0, 5).map((txn: any, idx: number) => (
                    <TableRow key={txn.id || idx}>
                      <TableCell className="font-medium">{txn.clientName}</TableCell>
                      <TableCell>{txn.type}</TableCell>
                      <TableCell>₹{txn.amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          txn.status === 'completed' ? 'bg-green-100 text-green-800' :
                          txn.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{txn.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <QuickActions actions={quickActions} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QC DASHBOARD
// ============================================================================

function QCDashboard({ data, quickActions }: { data: any; quickActions: QuickAction[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quality Control Dashboard</h1>
          <p className="text-muted-foreground">Review queue and quality metrics</p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          Pass Rate: {data?.passRate || 96}%
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Review Queue"
          value={data?.reviewQueue || 0}
          icon={FileText}
          color="text-blue-600"
          href="/qc/queue"
        />
        <StatsCard
          title="Reviewed Today"
          value={data?.reviewedToday || 0}
          icon={CheckCircle2}
          color="text-green-600"
        />
        <StatsCard
          title="Rejected"
          value={data?.rejectedCount || 0}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <StatsCard
          title="Avg Review Time"
          value={`${data?.avgReviewTime || 15} min`}
          icon={Clock}
          color="text-purple-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ServiceRequestsTable
            requests={data?.reviewItems || []}
            showClient
            title="Pending Reviews"
          />
        </div>
        <div className="space-y-6">
          <QuickActions actions={quickActions} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function DashboardSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RoleBasedDashboard() {
  const { toast } = useToast();

  // Fetch unified dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/dashboard'],
  });

  // Fetch quick actions
  const { data: actionsData } = useQuery({
    queryKey: ['/api/dashboard/quick-actions'],
  });

  // Fetch user context
  const { data: contextData } = useQuery({
    queryKey: ['/api/dashboard/context'],
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
        </div>
      </DashboardLayout>
    );
  }

  const role = dashboardData?.role || contextData?.context?.user?.role || 'client';
  const quickActions = actionsData?.actions || [];

  // Render role-specific dashboard
  switch (role) {
    case 'client':
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <ClientDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );

    case 'agent':
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <AgentDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );

    case 'ops_executive':
    case 'ops_lead':
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <OperationsDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );

    case 'qc_reviewer':
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <QCDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );

    case 'finance':
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <FinanceDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );

    case 'admin':
    case 'super_admin':
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <AdminDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );

    default:
      return (
        <DashboardLayout>
          <div className="container mx-auto p-6">
            <ClientDashboard data={dashboardData?.data} quickActions={quickActions} />
          </div>
        </DashboardLayout>
      );
  }
}
