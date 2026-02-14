import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout, PageShell, MetricCard, EmptyState } from "@/components/v3";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Crown,
  LayoutDashboard,
  Building2,
  Briefcase,
  DollarSign,
  Percent,
  ShieldCheck,
  Settings,
  BarChart3,
  FileText,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SecurityIncident {
  id: number;
  incidentNumber: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  status: string;
  title: string;
  description: string | null;
  affectedUsers: any[];
  timeline: { timestamp: string; action: string; actor: string; notes?: string }[];
  resolution: string | null;
  assignedTo: number | null;
  assigneeName?: string;
  reportedByName?: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
}

const INCIDENT_TYPES = [
  "unauthorized_access",
  "data_breach",
  "malware",
  "phishing",
  "dos_attack",
  "insider_threat",
  "policy_violation",
  "other",
];

const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;
const STATUS_OPTIONS = ["open", "investigating", "contained", "resolved", "closed"];

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

export default function SecurityCenter() {
  const { toast } = useToast();

  // Filter states
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);

  // Selected incident for actions
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [expandedIncidentId, setExpandedIncidentId] = useState<number | null>(null);

  // Form states
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "medium" as typeof SEVERITY_LEVELS[number],
    type: "other",
  });
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [timelineEntry, setTimelineEntry] = useState({ action: "", notes: "" });

  // Fetch incidents
  const { data: incidents, isLoading } = useQuery<SecurityIncident[]>({
    queryKey: ["/api/super-admin/security/incidents"],
  });

  // Fetch admin users for assignment
  const { data: adminUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/super-admin/users", { role: "admin" }],
  });

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: (data: typeof newIncident) =>
      apiRequest<SecurityIncident>("POST", "/api/super-admin/security/incidents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/security/incidents"] });
      setCreateDialogOpen(false);
      setNewIncident({ title: "", description: "", severity: "medium", type: "other" });
      toast({
        title: "Incident Created",
        description: "Security incident has been logged successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create incident.",
        variant: "destructive",
      });
    },
  });

  // Assign incident mutation
  const assignIncidentMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: number }) =>
      apiRequest<SecurityIncident>("POST", `/api/super-admin/security/incidents/${id}/assign`, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/security/incidents"] });
      setAssignDialogOpen(false);
      setSelectedIncident(null);
      setAssigneeId("");
      toast({
        title: "Incident Assigned",
        description: "Incident has been assigned successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign incident.",
        variant: "destructive",
      });
    },
  });

  // Resolve incident mutation
  const resolveIncidentMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: number; resolution: string }) =>
      apiRequest<SecurityIncident>("POST", `/api/super-admin/security/incidents/${id}/resolve`, { resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/security/incidents"] });
      setResolveDialogOpen(false);
      setSelectedIncident(null);
      setResolution("");
      toast({
        title: "Incident Resolved",
        description: "Incident has been marked as resolved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve incident.",
        variant: "destructive",
      });
    },
  });

  // Add timeline entry mutation
  const addTimelineEntryMutation = useMutation({
    mutationFn: ({ id, entry }: { id: number; entry: typeof timelineEntry }) =>
      apiRequest<SecurityIncident>("POST", `/api/super-admin/security/incidents/${id}/timeline`, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/security/incidents"] });
      setTimelineDialogOpen(false);
      setSelectedIncident(null);
      setTimelineEntry({ action: "", notes: "" });
      toast({
        title: "Timeline Updated",
        description: "Timeline entry has been added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add timeline entry.",
        variant: "destructive",
      });
    },
  });

  // Compute stats
  const stats = {
    open: incidents?.filter((i) => i.status === "open").length || 0,
    investigating: incidents?.filter((i) => i.status === "investigating").length || 0,
    resolved: incidents?.filter((i) => i.status === "resolved" || i.status === "closed").length || 0,
  };

  // Filter incidents
  const filteredIncidents = incidents?.filter((incident) => {
    if (severityFilter !== "all" && incident.severity !== severityFilter) return false;
    if (statusFilter !== "all" && incident.status !== statusFilter) return false;
    if (typeFilter !== "all" && incident.type !== typeFilter) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "low":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-700 border-red-200";
      case "investigating":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "contained":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "resolved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "closed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
        title="Security Center"
        subtitle="Monitor and manage security incidents"
        breadcrumbs={[{ label: "Super Admin", href: "/super-admin/dashboard" }, { label: "Security" }]}
        actions={
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Open Incidents"
              value={stats.open.toString()}
              trend={{ value: "Requires immediate attention", direction: stats.open > 0 ? "down" : "neutral" }}
              icon={AlertTriangle}
              accentColor="red"
            />
            <MetricCard
              label="Investigating"
              value={stats.investigating.toString()}
              trend={{ value: "Currently being analyzed", direction: "neutral" }}
              icon={Clock}
              accentColor="orange"
            />
            <MetricCard
              label="Resolved"
              value={stats.resolved.toString()}
              trend={{ value: "Successfully handled", direction: "up" }}
              icon={CheckCircle}
              accentColor="green"
            />
          </div>

          {/* Filter Bar */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-slate-600 text-sm">Severity:</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-32 bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-slate-600 text-sm">Status:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-slate-600 text-sm">Type:</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-44 bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {INCIDENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Incidents List */}
          <div className="space-y-4">
            {isLoading ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="p-8 text-center">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-3 animate-spin" />
                  <p className="text-slate-600">Loading incidents...</p>
                </CardContent>
              </Card>
            ) : filteredIncidents && filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => (
                <Card
                  key={incident.id}
                  className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() =>
                    setExpandedIncidentId(
                      expandedIncidentId === incident.id ? null : incident.id
                    )
                  }
                >
                  <CardContent className="p-6">
                    {/* Incident Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-500 text-sm font-mono">
                              {incident.incidentNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={getStatusColor(incident.status)}
                            >
                              {incident.status}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {incident.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(incident.createdAt)}
                            </span>
                            {incident.assigneeName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {incident.assigneeName}
                              </span>
                            )}
                            <span className="text-slate-500">{formatType(incident.type)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedIncidentId === incident.id && (
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        {/* Description */}
                        {incident.description && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">
                              Description
                            </h4>
                            <p className="text-slate-600">{incident.description}</p>
                          </div>
                        )}

                        {/* Affected Users */}
                        {incident.affectedUsers && incident.affectedUsers.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">
                              Affected Users ({incident.affectedUsers.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {incident.affectedUsers.map((user, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="border-slate-300 text-slate-600"
                                >
                                  {typeof user === "string" ? user : user.email || user.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resolution */}
                        {incident.resolution && (
                          <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Resolution
                            </h4>
                            <p className="text-slate-700">{incident.resolution}</p>
                            {incident.resolvedAt && (
                              <p className="text-emerald-600 text-sm mt-2">
                                Resolved on {formatDate(incident.resolvedAt)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Timeline */}
                        {incident.timeline && incident.timeline.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-4">
                              Timeline
                            </h4>
                            <div className="relative">
                              {/* Vertical line */}
                              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />

                              <div className="space-y-4">
                                {incident.timeline.map((entry, idx) => (
                                  <div key={idx} className="flex gap-4 relative">
                                    <div className="w-4 h-4 rounded-full bg-purple-600 border-2 border-purple-200 z-10 mt-1" />
                                    <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-slate-900">
                                          {entry.action}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {formatDate(entry.timestamp)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-600">
                                        by {entry.actor}
                                      </p>
                                      {entry.notes && (
                                        <p className="text-sm text-slate-500 mt-2 italic">
                                          "{entry.notes}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setTimelineDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Add Update
                          </Button>
                          {incident.status !== "resolved" && incident.status !== "closed" && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white border-slate-200">
                <EmptyState
                  icon={CheckCircle}
                  title="No Incidents Found"
                  description={
                    severityFilter !== "all" || statusFilter !== "all" || typeFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No security incidents have been reported"
                  }
                />
              </Card>
            )}
          </div>
        </div>

        {/* Create Incident Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                Report Security Incident
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Log a new security incident for investigation and tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-700">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the incident"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="bg-white border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Severity</Label>
                  <Select
                    value={newIncident.severity}
                    onValueChange={(value: typeof SEVERITY_LEVELS[number]) =>
                      setNewIncident({ ...newIncident, severity: value })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Type</Label>
                  <Select
                    value={newIncident.type}
                    onValueChange={(value) => setNewIncident({ ...newIncident, type: value })}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of what happened..."
                  rows={4}
                  value={newIncident.description}
                  onChange={(e) =>
                    setNewIncident({ ...newIncident, description: e.target.value })
                  }
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createIncidentMutation.mutate(newIncident)}
                disabled={!newIncident.title || createIncidentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {createIncidentMutation.isPending ? "Creating..." : "Create Incident"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Incident Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <User className="h-5 w-5 text-blue-600" />
                Assign Incident
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Assign this incident to a team member for investigation.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedIncident(null);
                  setAssigneeId("");
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedIncident && assigneeId) {
                    assignIncidentMutation.mutate({
                      id: selectedIncident.id,
                      assignedTo: parseInt(assigneeId),
                    });
                  }
                }}
                disabled={!assigneeId || assignIncidentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {assignIncidentMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Incident Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Resolve Incident
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Mark this incident as resolved and document the resolution.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-slate-700">Resolution Notes</Label>
                <Textarea
                  id="resolution"
                  placeholder="Describe how the incident was resolved..."
                  rows={4}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setResolveDialogOpen(false);
                  setSelectedIncident(null);
                  setResolution("");
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedIncident) {
                    resolveIncidentMutation.mutate({
                      id: selectedIncident.id,
                      resolution,
                    });
                  }
                }}
                disabled={!resolution || resolveIncidentMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {resolveIncidentMutation.isPending ? "Resolving..." : "Resolve Incident"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Timeline Entry Dialog */}
        <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Add Timeline Entry
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Add an update to the incident timeline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="action" className="text-slate-700">Action</Label>
                <Input
                  id="action"
                  placeholder="e.g., Started investigation, Contacted affected users"
                  value={timelineEntry.action}
                  onChange={(e) =>
                    setTimelineEntry({ ...timelineEntry, action: e.target.value })
                  }
                  className="bg-white border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-700">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional details..."
                  rows={3}
                  value={timelineEntry.notes}
                  onChange={(e) =>
                    setTimelineEntry({ ...timelineEntry, notes: e.target.value })
                  }
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTimelineDialogOpen(false);
                  setSelectedIncident(null);
                  setTimelineEntry({ action: "", notes: "" });
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedIncident && timelineEntry.action) {
                    addTimelineEntryMutation.mutate({
                      id: selectedIncident.id,
                      entry: timelineEntry,
                    });
                  }
                }}
                disabled={!timelineEntry.action || addTimelineEntryMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {addTimelineEntryMutation.isPending ? "Adding..." : "Add Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
