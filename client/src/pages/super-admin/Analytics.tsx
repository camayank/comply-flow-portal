import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, PageShell, MetricCard } from "@/components/v3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Activity,
  Download,
  Calendar,
  Crown,
  LayoutDashboard,
  Briefcase,
  Percent,
  ShieldCheck,
  Settings,
  FileText,
} from "lucide-react";

// Mock data for display
const mockAnalytics = {
  totalRevenue: 1250000,
  revenueChange: 12.5,
  activeUsers: 1234,
  userChange: 8.3,
  newTenants: 15,
  serviceRequests: 456,
  topAgents: [
    { name: "Agent 1", sales: 150000, commission: 15000 },
    { name: "Agent 2", sales: 120000, commission: 12000 },
    { name: "Agent 3", sales: 95000, commission: 9500 },
  ],
};

interface AnalyticsData {
  totalRevenue: number;
  revenueChange: number;
  activeUsers: number;
  userChange: number;
  newTenants: number;
  serviceRequests: number;
  topAgents: {
    name: string;
    sales: number;
    commission: number;
  }[];
}

const navigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
      { label: "Services", href: "/super-admin/services", icon: Briefcase },
      { label: "Pricing", href: "/super-admin/pricing", icon: DollarSign },
      { label: "Commissions", href: "/super-admin/commissions", icon: Percent },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Security", href: "/super-admin/security", icon: ShieldCheck },
      { label: "Operations", href: "/super-admin/operations", icon: Settings },
      { label: "Audit Log", href: "/audit-log", icon: FileText },
    ],
  },
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30d");

  // Query for analytics data (using mock data for now)
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/super-admin/analytics", dateRange],
    // Use mock data since API may not be ready
    placeholderData: mockAnalytics,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "text-emerald-600" : "text-red-600";
  };

  const getChangeBgColor = (change: number) => {
    return change >= 0 ? "bg-emerald-100" : "bg-red-100";
  };

  const handleExportCSV = () => {
    // Placeholder for CSV export functionality
    console.log("Exporting CSV...");
  };

  const handleExportPDF = () => {
    // Placeholder for PDF export functionality
    console.log("Exporting PDF...");
  };

  const data = analytics || mockAnalytics;
  const user = { name: "Super Admin", email: "superadmin@digicomply.com" };

  return (
    <DashboardLayout
      navigation={navigation}
      user={user}
      logo={
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-600" />
          <span className="text-lg font-bold text-slate-900">DigiComply</span>
        </div>
      }
    >
      <PageShell
        title="Platform Analytics"
        subtitle="Insights and performance metrics"
        breadcrumbs={[{ label: "Super Admin", href: "/super-admin/dashboard" }, { label: "Analytics" }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-600" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px] bg-white border-slate-200 text-slate-900">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={handleExportPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Total Revenue"
              value={isLoading ? "..." : formatCurrency(data.totalRevenue)}
              trend={{
                value: `${data.revenueChange > 0 ? "+" : ""}${data.revenueChange}% vs last period`,
                direction: data.revenueChange >= 0 ? "up" : "down",
              }}
              icon={DollarSign}
              accentColor="green"
            />
            <MetricCard
              label="Active Users"
              value={isLoading ? "..." : formatNumber(data.activeUsers)}
              trend={{
                value: `${data.userChange > 0 ? "+" : ""}${data.userChange}% vs last period`,
                direction: data.userChange >= 0 ? "up" : "down",
              }}
              icon={Users}
              accentColor="blue"
            />
            <MetricCard
              label="New Tenants"
              value={isLoading ? "..." : formatNumber(data.newTenants)}
              trend={{ value: "This month", direction: "neutral" }}
              icon={Building2}
              accentColor="purple"
            />
            <MetricCard
              label="Service Requests"
              value={isLoading ? "..." : formatNumber(data.serviceRequests)}
              trend={{ value: "This month", direction: "neutral" }}
              icon={Activity}
              accentColor="orange"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Over Time Chart Placeholder */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Revenue Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                    <p className="text-slate-900 font-medium">Line Chart</p>
                    <p className="text-sm text-slate-600">Revenue trends visualization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Growth Chart Placeholder */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <p className="text-slate-900 font-medium">Bar Chart</p>
                    <p className="text-sm text-slate-600">User acquisition metrics</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Distribution Chart Placeholder */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Service Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-full border-4 border-purple-600 border-t-transparent mx-auto mb-3" />
                    <p className="text-slate-900 font-medium">Pie Chart</p>
                    <p className="text-sm text-slate-600">Service type breakdown</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Agents Table */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  Top Performing Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Table Header */}
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-slate-600 pb-2 border-b border-slate-200">
                    <span>Agent</span>
                    <span className="text-right">Sales</span>
                    <span className="text-right">Commission</span>
                  </div>

                  {/* Table Rows */}
                  {data.topAgents.map((agent, index) => (
                    <div
                      key={agent.name}
                      className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-slate-900 font-medium">{agent.name}</span>
                      </div>
                      <span className="text-slate-900 text-right">
                        {formatCurrency(agent.sales)}
                      </span>
                      <span className="text-emerald-600 text-right">
                        {formatCurrency(agent.commission)}
                      </span>
                    </div>
                  ))}

                  {data.topAgents.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-900 font-medium">No Agent Data</p>
                      <p className="text-sm text-slate-600">Agent performance data will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
