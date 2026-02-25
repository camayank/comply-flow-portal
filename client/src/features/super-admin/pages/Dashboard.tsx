import * as React from "react";
import { DashboardLayout } from '@/layouts';
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  MetricCard,
  PageShell,
  DataTable,
  EmptyState,
} from "@/components/v3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { SUPER_ADMIN_NAVIGATION } from "@/config/super-admin-navigation";
import {
  Crown,
  Building2,
  DollarSign,
  ShieldCheck,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Briefcase,
  Settings,
  Clock,
  UserCheck,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

interface SuperAdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  activeTenants: number;
  pendingIncidents: number;
  monthlyRevenue: number;
}

interface SecurityIncident {
  id: number;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  createdAt: string;
  tenantName?: string;
}

interface OperationsSummary {
  serviceRequestsByStatus: Record<string, number>;
  tasksByStatus: Record<string, number>;
  slaComplianceRate: number;
  teamUtilization: {
    activeMembers: number;
    totalActiveTasks: number;
    avgTasksPerMember: number;
  };
  alerts: {
    overdueTasks: number;
    qcPendingTasks: number;
  };
}

const severityColors = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

export default function SuperAdminDashboard() {
  const { user: authUser } = useAuth();
  const { data: stats, isLoading } = useQuery<SuperAdminStats>({
    queryKey: ["/api/super-admin/stats"],
  });

  const { data: incidents } = useQuery<SecurityIncident[]>({
    queryKey: ["/api/super-admin/security/incidents", { status: "open", limit: 5 }],
  });

  const { data: operationsSummary } = useQuery<OperationsSummary>({
    queryKey: ["/api/admin/operations/summary"],
  });

  // Use actual authenticated user data
  const user = {
    name: authUser?.fullName || authUser?.username || "Super Admin",
    email: authUser?.email || "",
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const incidentColumns = [
    { key: "title", header: "Incident", sortable: true },
    {
      key: "severity",
      header: "Severity",
      render: (item: SecurityIncident) => (
        <Badge className={severityColors[item.severity]}>
          {item.severity.toUpperCase()}
        </Badge>
      ),
    },
    { key: "tenantName", header: "Tenant" },
    {
      key: "createdAt",
      header: "Reported",
      render: (item: SecurityIncident) =>
        new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout
      navigation={SUPER_ADMIN_NAVIGATION}
      user={user}
      logo={
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-600" />
          <span className="text-lg font-bold text-slate-900">DigiComply</span>
        </div>
      }
    >
      <PageShell
        title="Super Admin Dashboard"
        subtitle="Platform-wide management and oversight"
        breadcrumbs={[{ label: "Super Admin" }, { label: "Dashboard" }]}
        actions={
          <Link href="/super-admin/analytics">
            <Button variant="outline">View Analytics</Button>
          </Link>
        }
      >
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* System Health Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-700">System Status: Operational</p>
                    <p className="text-sm text-slate-600">All services running normally</p>
                  </div>
                </div>
                <Link href="/super-admin/operations">
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Users"
                value={stats?.totalUsers?.toLocaleString() || "0"}
                trend={{ value: `${stats?.activeUsers || 0} active`, direction: "neutral" }}
                icon={Users}
                accentColor="purple"
              />
              <MetricCard
                label="Active Tenants"
                value={stats?.activeTenants || "0"}
                trend={{ value: `of ${stats?.totalTenants || 0} total`, direction: "neutral" }}
                icon={Building2}
                accentColor="blue"
              />
              <MetricCard
                label="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0)}
                trend={{ value: "Recurring", direction: "up" }}
                icon={DollarSign}
                accentColor="green"
              />
              <MetricCard
                label="Pending Incidents"
                value={stats?.pendingIncidents || "0"}
                trend={{ value: "Requires attention", direction: stats?.pendingIncidents ? "down" : "neutral" }}
                icon={AlertTriangle}
                accentColor="red"
              />
            </div>

            {/* Operations Overview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Operations Overview
                </h3>
                <Link href="/super-admin/operations">
                  <Button variant="ghost" size="sm">View Details</Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Service Requests by Status */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-slate-700">Service Requests</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">In Progress</span>
                      <span className="font-medium text-blue-600">
                        {operationsSummary?.serviceRequestsByStatus?.in_progress || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">QC Pending</span>
                      <span className="font-medium text-amber-600">
                        {operationsSummary?.serviceRequestsByStatus?.qc_pending || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Completed</span>
                      <span className="font-medium text-emerald-600">
                        {operationsSummary?.serviceRequestsByStatus?.completed || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SLA Compliance */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-slate-700">SLA Compliance</span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    {operationsSummary?.slaComplianceRate || 0}%
                  </div>
                  <p className="text-sm text-slate-500">Tasks completed on time</p>
                </div>

                {/* Team Utilization */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-slate-700">Team Utilization</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Active Members</span>
                      <span className="font-medium">{operationsSummary?.teamUtilization?.activeMembers || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Active Tasks</span>
                      <span className="font-medium">{operationsSummary?.teamUtilization?.totalActiveTasks || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Avg per Member</span>
                      <span className="font-medium">{operationsSummary?.teamUtilization?.avgTasksPerMember || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-slate-700">Attention Needed</span>
                  </div>
                  <div className="space-y-2">
                    {(operationsSummary?.alerts?.overdueTasks || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm bg-red-50 rounded px-2 py-1">
                        <span className="text-red-700">Overdue Tasks</span>
                        <span className="font-bold text-red-700">{operationsSummary?.alerts?.overdueTasks}</span>
                      </div>
                    )}
                    {(operationsSummary?.alerts?.qcPendingTasks || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm bg-amber-50 rounded px-2 py-1">
                        <span className="text-amber-700">QC Queue</span>
                        <span className="font-bold text-amber-700">{operationsSummary?.alerts?.qcPendingTasks}</span>
                      </div>
                    )}
                    {(operationsSummary?.alerts?.overdueTasks || 0) === 0 &&
                     (operationsSummary?.alerts?.qcPendingTasks || 0) === 0 && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>All clear</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Incidents */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-red-500" />
                  Recent Security Incidents
                </h3>
                <Link href="/super-admin/security/incidents">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              {incidents && incidents.length > 0 ? (
                <DataTable
                  data={incidents}
                  columns={incidentColumns}
                  keyField="id"
                />
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="No Open Incidents"
                  description="All security incidents have been resolved."
                />
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link href="/super-admin/tenants">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <Building2 className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Manage Tenants</p>
                    <p className="text-sm text-slate-500">View organizations</p>
                  </div>
                </Link>
                <Link href="/super-admin/security">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <ShieldCheck className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Security Center</p>
                    <p className="text-sm text-slate-500">Incidents & logs</p>
                  </div>
                </Link>
                <Link href="/super-admin/operations">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <Activity className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Operations</p>
                    <p className="text-sm text-slate-500">System health</p>
                  </div>
                </Link>
                <Link href="/super-admin/analytics">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                    <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-medium text-slate-900">Analytics</p>
                    <p className="text-sm text-slate-500">Platform insights</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </DashboardLayout>
  );
}
