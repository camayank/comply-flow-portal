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
import { ADMIN_NAVIGATION } from "@/config/admin-navigation";
import {
  Users,
  Briefcase,
  FileBarChart,
  Settings,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  serviceRequests: number;
  leads: number;
  revenue: number;
}

interface PendingAction {
  id: number;
  type: string;
  title: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

export default function AdminDashboard() {
  const { user: authUser } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const { data: pending } = useQuery<PendingAction[]>({
    queryKey: ["/api/admin/dashboard/pending"],
  });

  // Use actual authenticated user data
  const user = {
    name: authUser?.fullName || authUser?.username || "Admin User",
    email: authUser?.email || "",
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const pendingColumns = [
    { key: "title", header: "Action", sortable: true },
    { key: "type", header: "Type" },
    {
      key: "priority",
      header: "Priority",
      render: (item: PendingAction) => (
        <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: PendingAction) =>
        new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout
      navigation={ADMIN_NAVIGATION}
      user={user}
      logo={<span className="text-lg font-bold text-slate-900">DigiComply</span>}
    >
      <PageShell
        title="Admin Dashboard"
        subtitle="Manage users, services, and operations"
        breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
        actions={
          <Link href="/admin/reports">
            <Button variant="outline">View Reports</Button>
          </Link>
        }
      >
        {statsLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Users"
                value={stats?.totalUsers?.toLocaleString() || "0"}
                trend={{ value: "Registered users", direction: "neutral" }}
                icon={Users}
                accentColor="blue"
              />
              <MetricCard
                label="Service Requests"
                value={stats?.serviceRequests?.toLocaleString() || "0"}
                trend={{ value: "Active requests", direction: "neutral" }}
                icon={Briefcase}
                accentColor="purple"
              />
              <MetricCard
                label="Leads"
                value={stats?.leads?.toLocaleString() || "0"}
                trend={{ value: "Potential clients", direction: "up" }}
                icon={TrendingUp}
                accentColor="green"
              />
              <MetricCard
                label="Revenue"
                value={formatCurrency(stats?.revenue || 0)}
                trend={{ value: "This month", direction: "up" }}
                icon={Activity}
                accentColor="teal"
              />
            </div>

            {/* Pending Actions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Pending Actions
                  {pending && pending.length > 0 && (
                    <Badge variant="secondary">{pending.length}</Badge>
                  )}
                </h3>
              </div>
              {pending && pending.length > 0 ? (
                <DataTable
                  data={pending}
                  columns={pendingColumns}
                  keyField="id"
                />
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="All Caught Up"
                  description="No pending actions at this time."
                />
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/users">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                    <Users className="h-6 w-6 text-slate-700 mb-2" />
                    <p className="font-medium text-slate-900">Manage Users</p>
                    <p className="text-sm text-slate-500">View and manage accounts</p>
                  </div>
                </Link>
                <Link href="/admin/reports">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                    <FileBarChart className="h-6 w-6 text-slate-700 mb-2" />
                    <p className="font-medium text-slate-900">View Reports</p>
                    <p className="text-sm text-slate-500">Analytics and insights</p>
                  </div>
                </Link>
                <Link href="/admin/services">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                    <Settings className="h-6 w-6 text-slate-700 mb-2" />
                    <p className="font-medium text-slate-900">Service Config</p>
                    <p className="text-sm text-slate-500">Configure services</p>
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
