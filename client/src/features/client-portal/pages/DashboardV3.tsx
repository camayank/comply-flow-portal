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
import {
  LayoutDashboard,
  FileText,
  Calendar,
  FolderOpen,
  HelpCircle,
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CLIENT_NAVIGATION } from "@/config/client-navigation";

interface ComplianceStatus {
  state: "GREEN" | "AMBER" | "RED";
  daysSafe: number;
  tasksCompleted: number;
  pendingActions: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysLeft: number;
    priority: "high" | "medium" | "low";
  }>;
  recentActivity: Array<{
    id: string;
    description: string;
    timestamp: string;
    type: string;
  }>;
}

// Use shared navigation configuration
const navigation = CLIENT_NAVIGATION;

const statusColors = {
  GREEN: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  AMBER: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  RED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
};

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

export default function ClientDashboard() {
  const { user: authUser } = useAuth();
  const { data, isLoading } = useQuery<ComplianceStatus>({
    queryKey: ["/api/v2/client/status"],
  });

  // Use actual authenticated user data
  const user = {
    name: authUser?.fullName || authUser?.username || "Client User",
    email: authUser?.email || "",
  };

  const deadlineColumns = [
    { key: "title", header: "Task", sortable: true },
    { key: "dueDate", header: "Due Date", sortable: true },
    {
      key: "daysLeft",
      header: "Days Left",
      render: (item: any) => (
        <span className={item.daysLeft <= 3 ? "text-red-600 font-medium" : ""}>
          {item.daysLeft} days
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (item: any) => (
        <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
          {item.priority}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      user={user}
      logo={<span className="text-lg font-bold text-slate-900">DigiComply</span>}
    >
      <PageShell
        title="Dashboard"
        subtitle="Your compliance overview"
        breadcrumbs={[{ label: "Dashboard" }]}
      >
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Compliance Status Banner */}
            <div
              className={`rounded-xl p-6 border ${statusColors[data.state].bg} ${statusColors[data.state].border}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {data.state === "GREEN" ? (
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  ) : data.state === "AMBER" ? (
                    <Clock className="h-8 w-8 text-amber-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <h2 className={`text-lg font-semibold ${statusColors[data.state].text}`}>
                      {data.state === "GREEN"
                        ? "All Compliances On Track"
                        : data.state === "AMBER"
                        ? "Action Required Soon"
                        : "Immediate Action Required"}
                    </h2>
                    <p className="text-slate-600">
                      {data.daysSafe} days until next deadline
                    </p>
                  </div>
                </div>
                <Link href="/compliance-calendar">
                  <Button variant="outline">View Calendar</Button>
                </Link>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Tasks Completed"
                value={data.tasksCompleted}
                trend={{ value: "This month", direction: "up" }}
                icon={CheckCircle}
                accentColor="green"
              />
              <MetricCard
                label="Pending Actions"
                value={data.pendingActions}
                trend={{ value: data.pendingActions > 0 ? "Due soon" : "All clear", direction: data.pendingActions > 0 ? "down" : "neutral" }}
                icon={Clock}
                accentColor="orange"
              />
              <MetricCard
                label="Days Safe"
                value={data.daysSafe}
                trend={{ value: "Until next deadline", direction: "neutral" }}
                icon={TrendingUp}
                accentColor="blue"
              />
              <MetricCard
                label="Compliance Score"
                value="98%"
                trend={{ value: "Excellent", direction: "up" }}
                icon={BarChart3}
                accentColor="purple"
              />
            </div>

            {/* Upcoming Deadlines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Upcoming Deadlines
                </h3>
                <Link href="/compliance-calendar">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              {data.upcomingDeadlines.length > 0 ? (
                <DataTable
                  data={data.upcomingDeadlines}
                  columns={deadlineColumns}
                  keyField="id"
                />
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming deadlines"
                  description="All your compliance tasks are up to date."
                />
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/vault">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                    <FileText className="h-6 w-6 text-slate-700 mb-2" />
                    <p className="font-medium text-slate-900">Upload Documents</p>
                    <p className="text-sm text-slate-500">Add new files to vault</p>
                  </div>
                </Link>
                <Link href="/compliance-calendar">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                    <Calendar className="h-6 w-6 text-slate-700 mb-2" />
                    <p className="font-medium text-slate-900">View Calendar</p>
                    <p className="text-sm text-slate-500">See all deadlines</p>
                  </div>
                </Link>
                <Link href="/support">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                    <HelpCircle className="h-6 w-6 text-slate-700 mb-2" />
                    <p className="font-medium text-slate-900">Get Help</p>
                    <p className="text-sm text-slate-500">Contact support</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Unable to load dashboard"
            description="Please try refreshing the page."
            action={{ label: "Refresh", onClick: () => window.location.reload() }}
          />
        )}
      </PageShell>
    </DashboardLayout>
  );
}
