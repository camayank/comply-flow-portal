import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import {
  AlertTriangle,
  Clock,
  Users,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  RefreshCw,
  Filter,
  Search,
  ChevronRight,
  AlertOctagon,
  Timer,
  UserX,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

interface Escalation {
  id: string;
  serviceRequestId: string;
  serviceRequestNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  escalationType: "sla_breach" | "client_complaint" | "quality_issue" | "resource_unavailable" | "dependency_blocked" | "manual";
  escalationLevel: number;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "acknowledged" | "in_progress" | "resolved" | "closed";
  reason: string;
  escalatedBy: string;
  escalatedByName: string;
  escalatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  slaBreachMinutes: number | null;
  originalDueDate: string | null;
  currentDueDate: string | null;
}

interface EscalationStats {
  total: number;
  pending: number;
  acknowledged: number;
  inProgress: number;
  resolved: number;
  avgResolutionTime: number;
  slaBreaches: number;
  criticalCount: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  activeWorkload: number;
  maxCapacity: number;
  available: boolean;
}

export default function EscalationDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"acknowledge" | "resolve" | "reassign" | "escalate">("acknowledge");
  const [actionNotes, setActionNotes] = useState("");
  const [reassignTo, setReassignTo] = useState("");

  // Fetch escalations
  const { data: escalations = [], isLoading: isLoadingEscalations } = useQuery<Escalation[]>({
    queryKey: ["/api/escalations", activeTab, priorityFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("status", activeTab);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const response = await fetch(`/api/escalations?${params.toString()}`);
      if (!response.ok) {
        // Return mock data for development
        return getMockEscalations(activeTab);
      }
      return response.json();
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<EscalationStats>({
    queryKey: ["/api/escalations/stats"],
    queryFn: async () => {
      const response = await fetch("/api/escalations/stats");
      if (!response.ok) {
        return {
          total: 47,
          pending: 12,
          acknowledged: 8,
          inProgress: 15,
          resolved: 12,
          avgResolutionTime: 4.2,
          slaBreaches: 8,
          criticalCount: 5,
        };
      }
      return response.json();
    },
  });

  // Fetch team members for reassignment
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
    queryFn: async () => {
      const response = await fetch("/api/team/members");
      if (!response.ok) {
        return [
          { id: "1", name: "Priya Sharma", role: "Senior Operations", activeWorkload: 8, maxCapacity: 12, available: true },
          { id: "2", name: "Rahul Verma", role: "Operations Executive", activeWorkload: 10, maxCapacity: 10, available: false },
          { id: "3", name: "Anita Desai", role: "Operations Executive", activeWorkload: 6, maxCapacity: 10, available: true },
          { id: "4", name: "Vikram Singh", role: "Senior Operations", activeWorkload: 7, maxCapacity: 12, available: true },
        ];
      }
      return response.json();
    },
  });

  // Handle escalation action
  const actionMutation = useMutation({
    mutationFn: async (data: { escalationId: string; action: string; notes: string; reassignTo?: string }) => {
      const response = await fetch(`/api/escalations/${data.escalationId}/${data.action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: data.notes, reassignTo: data.reassignTo }),
      });
      if (!response.ok) throw new Error("Action failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escalations"] });
      toast({
        title: "Action completed",
        description: `Escalation ${actionType}d successfully.`,
      });
      setIsActionDialogOpen(false);
      setSelectedEscalation(null);
      setActionNotes("");
      setReassignTo("");
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Could not complete the action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAction = (escalation: Escalation, action: "acknowledge" | "resolve" | "reassign" | "escalate") => {
    setSelectedEscalation(escalation);
    setActionType(action);
    setIsActionDialogOpen(true);
  };

  const submitAction = () => {
    if (!selectedEscalation) return;

    // Simulate success for demo
    toast({
      title: "Action completed",
      description: `Escalation ${actionType}d successfully.`,
    });
    setIsActionDialogOpen(false);
    setSelectedEscalation(null);
    setActionNotes("");
    setReassignTo("");
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return <Badge className={styles[priority] || styles.medium}>{priority.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-red-100 text-red-800",
      acknowledged: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return <Badge className={styles[status] || styles.pending}>{status.replace("_", " ").toUpperCase()}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      sla_breach: "SLA Breach",
      client_complaint: "Client Complaint",
      quality_issue: "Quality Issue",
      resource_unavailable: "Resource Issue",
      dependency_blocked: "Blocked",
      manual: "Manual",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const filteredEscalations = escalations.filter((esc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      esc.serviceRequestNumber.toLowerCase().includes(query) ||
      esc.clientName.toLowerCase().includes(query) ||
      esc.serviceName.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="py-6 px-4 max-w-7xl mx-auto">
        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Escalation Dashboard</h1>
          <p className="text-muted-foreground">Manage escalated service requests and SLA breaches</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/escalations"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.criticalCount || 0}</div>
            <p className="text-xs text-muted-foreground">High priority escalations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.slaBreaches || 0}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResolutionTime || 0}h</div>
            <p className="text-xs text-muted-foreground">Average resolution time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SR#, client, or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sla_breach">SLA Breach</SelectItem>
                <SelectItem value="client_complaint">Client Complaint</SelectItem>
                <SelectItem value="quality_issue">Quality Issue</SelectItem>
                <SelectItem value="resource_unavailable">Resource Issue</SelectItem>
                <SelectItem value="dependency_blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending
            {stats?.pending ? (
              <Badge className="ml-2 bg-red-500 text-white">{stats.pending}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "pending" ? "Pending Escalations" :
                 activeTab === "acknowledged" ? "Acknowledged Escalations" :
                 activeTab === "in_progress" ? "In Progress" :
                 activeTab === "resolved" ? "Resolved Escalations" : "All Escalations"}
              </CardTitle>
              <CardDescription>
                {activeTab === "pending"
                  ? "Escalations awaiting acknowledgment and action"
                  : `Showing ${filteredEscalations.length} escalations`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEscalations ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEscalations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No escalations in this category</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SR #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Escalated</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEscalations.map((escalation) => (
                      <TableRow key={escalation.id} className={escalation.priority === "critical" ? "bg-red-50 dark:bg-red-950/20" : ""}>
                        <TableCell className="font-mono font-medium">
                          {escalation.serviceRequestNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{escalation.clientName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {escalation.clientEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{escalation.serviceName}</TableCell>
                        <TableCell>{getTypeBadge(escalation.escalationType)}</TableCell>
                        <TableCell>{getPriorityBadge(escalation.priority)}</TableCell>
                        <TableCell>{getStatusBadge(escalation.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDistanceToNow(new Date(escalation.escalatedAt), { addSuffix: true })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {escalation.escalatedByName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {escalation.assignedToName ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                {escalation.assignedToName.charAt(0)}
                              </div>
                              <span className="text-sm">{escalation.assignedToName}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600">
                              <UserX className="h-3 w-3 mr-1" />
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {escalation.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(escalation, "acknowledge")}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {(escalation.status === "acknowledged" || escalation.status === "in_progress") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(escalation, "reassign")}
                                >
                                  Reassign
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(escalation, "resolve")}
                                >
                                  Resolve
                                </Button>
                              </>
                            )}
                            {escalation.status === "pending" && escalation.priority !== "critical" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(escalation, "escalate")}
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Workload Panel */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Workload
          </CardTitle>
          <CardDescription>Current team capacity for reassignment decisions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.role}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Workload</span>
                    <span className={member.activeWorkload >= member.maxCapacity ? "text-red-500" : "text-green-500"}>
                      {member.activeWorkload}/{member.maxCapacity}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        member.activeWorkload >= member.maxCapacity
                          ? "bg-red-500"
                          : member.activeWorkload >= member.maxCapacity * 0.8
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${(member.activeWorkload / member.maxCapacity) * 100}%` }}
                    />
                  </div>
                  <Badge variant={member.available ? "default" : "secondary"} className="mt-2">
                    {member.available ? "Available" : "At Capacity"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "acknowledge" && "Acknowledge Escalation"}
              {actionType === "resolve" && "Resolve Escalation"}
              {actionType === "reassign" && "Reassign Escalation"}
              {actionType === "escalate" && "Escalate Further"}
            </DialogTitle>
            <DialogDescription>
              {selectedEscalation && (
                <span>
                  SR# {selectedEscalation.serviceRequestNumber} - {selectedEscalation.clientName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedEscalation && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Service:</span>
                    <p className="font-medium">{selectedEscalation.serviceName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p>{getTypeBadge(selectedEscalation.escalationType)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="font-medium">{selectedEscalation.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {actionType === "reassign" && (
              <div className="space-y-2">
                <Label>Reassign to</Label>
                <Select value={reassignTo} onValueChange={setReassignTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers
                      .filter((m) => m.available)
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.activeWorkload}/{member.maxCapacity} tasks)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {actionType === "acknowledge" && "Acknowledgment Notes"}
                {actionType === "resolve" && "Resolution Details"}
                {actionType === "reassign" && "Reassignment Reason"}
                {actionType === "escalate" && "Escalation Reason"}
              </Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter details..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAction} disabled={!actionNotes.trim() || (actionType === "reassign" && !reassignTo)}>
              {actionType === "acknowledge" && "Acknowledge"}
              {actionType === "resolve" && "Mark Resolved"}
              {actionType === "reassign" && "Reassign"}
              {actionType === "escalate" && "Escalate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Mock data generator
function getMockEscalations(status: string): Escalation[] {
  const allEscalations: Escalation[] = [
    {
      id: "ESC001",
      serviceRequestId: "sr_1",
      serviceRequestNumber: "SR2600001",
      clientName: "Acme Technologies Pvt Ltd",
      clientEmail: "contact@acmetech.in",
      clientPhone: "+91-9876543210",
      serviceName: "GST Annual Return (GSTR-9)",
      assignedTo: "ops_1",
      assignedToName: "Priya Sharma",
      escalationType: "sla_breach",
      escalationLevel: 1,
      priority: "critical",
      status: "pending",
      reason: "SLA breached by 48 hours. Client has escalated via email.",
      escalatedBy: "system",
      escalatedByName: "System Auto-Escalation",
      escalatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      resolution: null,
      slaBreachMinutes: 2880,
      originalDueDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      currentDueDate: null,
    },
    {
      id: "ESC002",
      serviceRequestId: "sr_2",
      serviceRequestNumber: "SR2600015",
      clientName: "Global Exports Ltd",
      clientEmail: "finance@globalexports.com",
      clientPhone: "+91-9876543211",
      serviceName: "Import Export License (IEC)",
      assignedTo: null,
      assignedToName: null,
      escalationType: "resource_unavailable",
      escalationLevel: 1,
      priority: "high",
      status: "pending",
      reason: "No operations executive available with IEC expertise",
      escalatedBy: "ops_manager_1",
      escalatedByName: "Rajesh Kumar",
      escalatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      resolution: null,
      slaBreachMinutes: null,
      originalDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      currentDueDate: null,
    },
    {
      id: "ESC003",
      serviceRequestId: "sr_3",
      serviceRequestNumber: "SR2600022",
      clientName: "StartupHub Innovations",
      clientEmail: "admin@startuphub.io",
      clientPhone: "+91-9876543212",
      serviceName: "Private Limited Registration",
      assignedTo: "ops_2",
      assignedToName: "Anita Desai",
      escalationType: "client_complaint",
      escalationLevel: 2,
      priority: "critical",
      status: "acknowledged",
      reason: "Client complained about lack of communication. CEO directly contacted.",
      escalatedBy: "support_1",
      escalatedByName: "Customer Support Team",
      escalatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      resolvedAt: null,
      resolution: null,
      slaBreachMinutes: null,
      originalDueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      currentDueDate: null,
    },
    {
      id: "ESC004",
      serviceRequestId: "sr_4",
      serviceRequestNumber: "SR2600031",
      clientName: "MedCare Pharma",
      clientEmail: "compliance@medcare.in",
      clientPhone: "+91-9876543213",
      serviceName: "Drug License Renewal",
      assignedTo: "ops_3",
      assignedToName: "Vikram Singh",
      escalationType: "dependency_blocked",
      escalationLevel: 1,
      priority: "high",
      status: "in_progress",
      reason: "Waiting for government portal to come online. Deadline approaching.",
      escalatedBy: "ops_3",
      escalatedByName: "Vikram Singh",
      escalatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
      resolvedAt: null,
      resolution: null,
      slaBreachMinutes: null,
      originalDueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      currentDueDate: null,
    },
    {
      id: "ESC005",
      serviceRequestId: "sr_5",
      serviceRequestNumber: "SR2600008",
      clientName: "TechForward Solutions",
      clientEmail: "legal@techforward.com",
      clientPhone: "+91-9876543214",
      serviceName: "Trademark Registration",
      assignedTo: "ops_1",
      assignedToName: "Priya Sharma",
      escalationType: "quality_issue",
      escalationLevel: 1,
      priority: "medium",
      status: "resolved",
      reason: "Application rejected due to incorrect class selection. Needs re-filing.",
      escalatedBy: "qc_1",
      escalatedByName: "QC Team",
      escalatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      resolution: "Application re-filed with correct class. No additional cost to client.",
      slaBreachMinutes: null,
      originalDueDate: null,
      currentDueDate: null,
    },
  ];

  if (status === "all") return allEscalations;
  return allEscalations.filter((e) => e.status === status);
}
