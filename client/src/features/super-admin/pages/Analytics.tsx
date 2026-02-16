/**
 * Super Admin Analytics Dashboard
 *
 * Platform-wide analytics with real Recharts visualizations:
 * - Revenue over time (Line Chart)
 * - User growth (Bar Chart)
 * - Service distribution (Pie Chart)
 * - Top performing agents table
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts";
import { PageShell, MetricCard } from "@/components/v3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
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
  Link as LinkIcon,
} from "lucide-react";

// Chart data types
interface RevenueDataPoint {
  month: string;
  revenue: number;
  target: number;
}

interface UserGrowthDataPoint {
  month: string;
  newUsers: number;
  activeUsers: number;
}

interface ServiceDistribution {
  name: string;
  value: number;
  color: string;
}

interface TopAgent {
  name: string;
  sales: number;
  commission: number;
}

interface AnalyticsData {
  totalRevenue: number;
  revenueChange: number;
  activeUsers: number;
  userChange: number;
  newTenants: number;
  tenantsChange: number;
  serviceRequests: number;
  requestsChange: number;
  revenueData: RevenueDataPoint[];
  userGrowthData: UserGrowthDataPoint[];
  serviceDistribution: ServiceDistribution[];
  topAgents: TopAgent[];
}

// Mock data with realistic values
const mockAnalytics: AnalyticsData = {
  totalRevenue: 12500000,
  revenueChange: 12.5,
  activeUsers: 1234,
  userChange: 8.3,
  newTenants: 15,
  tenantsChange: 25,
  serviceRequests: 456,
  requestsChange: -5.2,
  revenueData: [
    { month: "Jan", revenue: 850000, target: 800000 },
    { month: "Feb", revenue: 920000, target: 850000 },
    { month: "Mar", revenue: 1050000, target: 900000 },
    { month: "Apr", revenue: 980000, target: 950000 },
    { month: "May", revenue: 1150000, target: 1000000 },
    { month: "Jun", revenue: 1280000, target: 1050000 },
    { month: "Jul", revenue: 1350000, target: 1100000 },
    { month: "Aug", revenue: 1420000, target: 1150000 },
    { month: "Sep", revenue: 1380000, target: 1200000 },
    { month: "Oct", revenue: 1520000, target: 1250000 },
    { month: "Nov", revenue: 1650000, target: 1300000 },
    { month: "Dec", revenue: 1450000, target: 1350000 },
  ],
  userGrowthData: [
    { month: "Jan", newUsers: 45, activeUsers: 320 },
    { month: "Feb", newUsers: 52, activeUsers: 358 },
    { month: "Mar", newUsers: 68, activeUsers: 412 },
    { month: "Apr", newUsers: 74, activeUsers: 465 },
    { month: "May", newUsers: 89, activeUsers: 534 },
    { month: "Jun", newUsers: 95, activeUsers: 612 },
    { month: "Jul", newUsers: 112, activeUsers: 698 },
    { month: "Aug", newUsers: 128, activeUsers: 802 },
    { month: "Sep", newUsers: 135, activeUsers: 912 },
    { month: "Oct", newUsers: 148, activeUsers: 1032 },
    { month: "Nov", newUsers: 156, activeUsers: 1156 },
    { month: "Dec", newUsers: 132, activeUsers: 1234 },
  ],
  serviceDistribution: [
    { name: "GST Filing", value: 35, color: "#10b981" },
    { name: "Company Registration", value: 25, color: "#3b82f6" },
    { name: "Trademark", value: 15, color: "#8b5cf6" },
    { name: "Compliance", value: 15, color: "#f59e0b" },
    { name: "Other", value: 10, color: "#6b7280" },
  ],
  topAgents: [
    { name: "Rajesh Kumar", sales: 1850000, commission: 185000 },
    { name: "Priya Sharma", sales: 1520000, commission: 152000 },
    { name: "Amit Patel", sales: 1340000, commission: 134000 },
    { name: "Sneha Gupta", sales: 1180000, commission: 118000 },
    { name: "Vikram Singh", sales: 980000, commission: 98000 },
  ],
};

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
      { label: "Integrations", href: "/super-admin/integrations", icon: LinkIcon },
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
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30d");

  // Query for analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/super-admin/analytics", dateRange],
    placeholderData: mockAnalytics,
  });

  const data = analytics || mockAnalytics;
  const user = { name: "Super Admin", email: "superadmin@digicomply.com" };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const handleExportCSV = () => {
    // Create CSV content
    const csvRows = [
      ["Metric", "Value"],
      ["Total Revenue", data.totalRevenue],
      ["Active Users", data.activeUsers],
      ["New Tenants", data.newTenants],
      ["Service Requests", data.serviceRequests],
      [""],
      ["Month", "Revenue", "Target"],
      ...data.revenueData.map(r => [r.month, r.revenue, r.target]),
      [""],
      ["Agent", "Sales", "Commission"],
      ...data.topAgents.map(a => [a.name, a.sales, a.commission]),
    ];

    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: "CSV file downloaded successfully." });
  };

  const handleExportPDF = () => {
    // For PDF, we'd typically use a library like jsPDF or call a backend endpoint
    // For now, trigger a print dialog which can save as PDF
    window.print();
    toast({ title: "Print Dialog", description: "Use 'Save as PDF' to export." });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("revenue") || entry.name.includes("Revenue") || entry.name.includes("target") || entry.name.includes("Target")
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
        subtitle="Insights and performance metrics across the platform"
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
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              trend={{
                value: `${data.tenantsChange > 0 ? "+" : ""}${data.tenantsChange}% this month`,
                direction: data.tenantsChange >= 0 ? "up" : "down",
              }}
              icon={Building2}
              accentColor="purple"
            />
            <MetricCard
              label="Service Requests"
              value={isLoading ? "..." : formatNumber(data.serviceRequests)}
              trend={{
                value: `${data.requestsChange > 0 ? "+" : ""}${data.requestsChange}% this month`,
                direction: data.requestsChange >= 0 ? "up" : "down",
              }}
              icon={Activity}
              accentColor="orange"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Over Time - Line Chart */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Revenue Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickFormatter={formatCompactCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Growth - Bar Chart */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="newUsers"
                      name="New Users"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="activeUsers"
                      name="Active Users"
                      fill="#93c5fd"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution - Pie Chart */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Service Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.serviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "#64748b" }}
                    >
                      {data.serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Share"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
                      <span className="text-emerald-600 text-right font-medium">
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
