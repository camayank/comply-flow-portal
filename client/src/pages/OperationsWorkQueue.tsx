/**
 * UNIFIED OPERATIONS WORK QUEUE
 *
 * Central dashboard for operations team showing:
 * - All work items with real-time SLA status
 * - At-risk and breached items highlighted
 * - Escalation indicators and history
 * - Assignment management
 * - Client-visible status updates
 *
 * Follows US compliance/tax tech stack principles:
 * - Complete audit trail visibility
 * - No work item gets lost
 * - Transparent status for all stakeholders
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useWorkQueue,
  useAtRiskItems,
  useBreachedItems,
  useWorkQueueStats,
  useTriggerEscalationCheck,
  useActivityLog,
} from "@/hooks/useOperations";
import { SLA_STATUSES } from "@/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Filter,
  User,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Bell,
  Eye,
  UserPlus,
  History,
  FileText,
  Building2,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// Types
interface WorkItem {
  id: number;
  workItemType: string;
  referenceId: number;
  serviceRequestId?: number;
  serviceKey?: string;
  entityId?: number;
  entityName?: string;
  currentStatus: string;
  priority: string;
  assignedTo?: number;
  assignedToName?: string;
  assignedToRole?: string;
  slaDeadline?: string;
  slaStatus?: string;
  slaHoursRemaining?: number;
  escalationLevel?: number;
  lastEscalatedAt?: string;
  createdAt?: string;
  lastActivityAt?: string;
  ageHours?: number;
  clientVisible?: boolean;
  clientStatusLabel?: string;
  dueDate?: string;
  serviceTypeName?: string;
  periodLabel?: string;
}

interface WorkQueueStats {
  total: number;
  onTrack: number;
  atRisk: number;
  warning: number;
  breached: number;
  unassigned: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byAssignee: Record<string, number>;
}

// SLA Status Badge Component
function SlaStatusBadge({ status, hoursRemaining }: { status?: string; hoursRemaining?: number }) {
  const getStatusConfig = () => {
    switch (status) {
      case "breached":
        return { color: "bg-red-500", icon: AlertCircle, label: "BREACHED", pulse: true };
      case "warning":
        return { color: "bg-orange-500", icon: AlertTriangle, label: "WARNING", pulse: true };
      case "at_risk":
        return { color: "bg-yellow-500", icon: Clock, label: "AT RISK", pulse: false };
      case "on_track":
      default:
        return { color: "bg-green-500", icon: CheckCircle2, label: "ON TRACK", pulse: false };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${config.color} text-white ${config.pulse ? "animate-pulse" : ""}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {hoursRemaining !== undefined && (
        <span className="text-xs text-muted-foreground">
          {hoursRemaining > 0 ? `${hoursRemaining}h left` : `${Math.abs(hoursRemaining)}h over`}
        </span>
      )}
    </div>
  );
}

// Priority Badge Component
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    HIGH: "bg-orange-100 text-orange-800 border-orange-200",
    MEDIUM: "bg-blue-100 text-blue-800 border-blue-200",
    LOW: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge variant="outline" className={colors[priority] || colors.MEDIUM}>
      {priority}
    </Badge>
  );
}

// Escalation Level Indicator
function EscalationIndicator({ level, lastEscalatedAt }: { level?: number; lastEscalatedAt?: string }) {
  if (!level || level === 0) return null;

  const getEscalationConfig = () => {
    switch (level) {
      case 1:
        return { color: "text-yellow-600", label: "L1 Warning" };
      case 2:
        return { color: "text-orange-600", label: "L2 Critical" };
      case 3:
        return { color: "text-red-600", label: "L3 Breach" };
      default:
        return { color: "text-gray-600", label: `L${level}` };
    }
  };

  const config = getEscalationConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`flex items-center gap-1 ${config.color}`}>
            <Bell className="h-4 w-4" />
            <span className="text-xs font-medium">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Escalated {lastEscalatedAt ? formatDistanceToNow(new Date(lastEscalatedAt), { addSuffix: true }) : "recently"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = "text-gray-900",
  bgColor = "bg-gray-50",
  onClick,
}: {
  title: string;
  value: number;
  icon: any;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: string;
  bgColor?: string;
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
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {trendLabel && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" && <TrendingUp className="h-3 w-3 text-green-600" />}
                {trend === "down" && <TrendingDown className="h-3 w-3 text-red-600" />}
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Log Component
function ActivityLog({ serviceRequestId }: { serviceRequestId: number }) {
  const { data: activitiesData, isLoading } = useActivityLog(serviceRequestId);
  const activities = activitiesData?.activities || activitiesData || [];

  if (isLoading) {
    return <div className="text-center py-4">Loading activity...</div>;
  }

  if (!activities || activities.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No activity recorded</div>;
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.map((activity: any) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex-shrink-0">
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{activity.activityDescription}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {activity.isSystemGenerated ? "System" : activity.performedByName || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true })}
              </span>
              {activity.clientVisible && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="h-2 w-2 mr-1" />
                  Client visible
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Work Item Detail Dialog
function WorkItemDetailDialog({ item, onClose }: { item: WorkItem; onClose: () => void }) {
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {item.serviceTypeName || item.workItemType} - {item.entityName}
        </DialogTitle>
        <DialogDescription>
          {item.periodLabel && `Period: ${item.periodLabel}`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 py-4">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{item.currentStatus}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">SLA Status</p>
          <SlaStatusBadge status={item.slaStatus} hoursRemaining={item.slaHoursRemaining} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Priority</p>
          <PriorityBadge priority={item.priority} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Assigned To</p>
          <p className="font-medium">{item.assignedToName || "Unassigned"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Age</p>
          <p className="font-medium">{item.ageHours || 0} hours</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Escalation Level</p>
          <EscalationIndicator level={item.escalationLevel} lastEscalatedAt={item.lastEscalatedAt} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          Activity Log
        </h4>
        {item.serviceRequestId && <ActivityLog serviceRequestId={item.serviceRequestId} />}
      </div>
    </DialogContent>
  );
}

// Main Component
export default function OperationsWorkQueue() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [filters, setFilters] = useState({
    slaStatus: "" as '' | 'on_track' | 'at_risk' | 'warning' | 'breached',
    priority: "",
    assignee: "",
  });

  // Fetch work queue using new hooks
  const { data: workQueueData, isLoading, refetch } = useWorkQueue(
    filters.slaStatus || filters.priority
      ? {
          slaStatus: filters.slaStatus || undefined,
          priority: filters.priority || undefined,
        }
      : undefined
  );

  // Fetch at-risk items
  const { data: atRiskData } = useAtRiskItems();

  // Fetch breached items
  const { data: breachedData } = useBreachedItems();

  // Fetch unassigned items - use work queue with no assignedTo filter
  const unassignedData = { items: workQueueData?.items?.filter((item: WorkItem) => !item.assignedTo) || [] };

  // Manual process trigger using new hook
  const triggerCheck = useTriggerEscalationCheck();

  const stats = workQueueData?.stats;
  const items = workQueueData?.items || [];

  // Filter items based on active tab
  const getFilteredItems = () => {
    switch (activeTab) {
      case "at-risk":
        return atRiskData?.items || [];
      case "breached":
        return breachedData?.items || [];
      case "unassigned":
        return unassignedData?.items || [];
      default:
        return items;
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Work Queue</h1>
          <p className="text-muted-foreground">
            Complete visibility into all work items with SLA tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => triggerCheck.mutate()}
            disabled={triggerCheck.isPending}
          >
            <Zap className="h-4 w-4 mr-2" />
            Process Now
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Items"
          value={stats?.total || 0}
          icon={FileText}
          onClick={() => setActiveTab("all")}
        />
        <StatsCard
          title="On Track"
          value={stats?.onTrack || 0}
          icon={CheckCircle2}
          color="text-green-600"
          bgColor="bg-green-50"
          onClick={() => setActiveTab("all")}
        />
        <StatsCard
          title="At Risk"
          value={(stats?.atRisk || 0) + (stats?.warning || 0)}
          icon={AlertTriangle}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
          onClick={() => setActiveTab("at-risk")}
        />
        <StatsCard
          title="Breached"
          value={stats?.breached || 0}
          icon={AlertCircle}
          color="text-red-600"
          bgColor="bg-red-50"
          onClick={() => setActiveTab("breached")}
        />
        <StatsCard
          title="Unassigned"
          value={stats?.unassigned || 0}
          icon={UserPlus}
          color="text-purple-600"
          bgColor="bg-purple-50"
          onClick={() => setActiveTab("unassigned")}
        />
      </div>

      {/* Tabs and Filters */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="at-risk" className="text-yellow-600">
                  At Risk ({(stats?.atRisk || 0) + (stats?.warning || 0)})
                </TabsTrigger>
                <TabsTrigger value="breached" className="text-red-600">
                  Breached ({stats?.breached || 0})
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="text-purple-600">
                  Unassigned ({stats?.unassigned || 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Select
                value={filters.priority}
                onValueChange={(v) => setFilters({ ...filters, priority: v })}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">All Clear!</h3>
              <p className="text-muted-foreground">
                No items in this category. Great work!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service / Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: WorkItem) => (
                  <TableRow
                    key={item.id}
                    className={
                      item.slaStatus === "breached"
                        ? "bg-red-50"
                        : item.slaStatus === "warning"
                        ? "bg-orange-50"
                        : item.slaStatus === "at_risk"
                        ? "bg-yellow-50"
                        : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{item.serviceTypeName || item.workItemType}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {item.entityName || "Unknown Client"}
                          </div>
                          {item.periodLabel && (
                            <p className="text-xs text-muted-foreground">{item.periodLabel}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.currentStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <SlaStatusBadge
                        status={item.slaStatus}
                        hoursRemaining={item.slaHoursRemaining}
                      />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={item.priority} />
                    </TableCell>
                    <TableCell>
                      {item.assignedToName ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{item.assignedToName}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-purple-600">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <EscalationIndicator
                        level={item.escalationLevel}
                        lastEscalatedAt={item.lastEscalatedAt}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.ageHours || 0}h
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {selectedItem && selectedItem.id === item.id && (
                          <WorkItemDetailDialog
                            item={selectedItem}
                            onClose={() => setSelectedItem(null)}
                          />
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Breach Summary Alert */}
      {(stats?.breached || 0) > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">
                  {stats?.breached} SLA Breach{stats?.breached !== 1 ? "es" : ""} Require Immediate Attention
                </h3>
                <p className="text-sm text-red-600">
                  These items have exceeded their service level agreements and need remediation.
                </p>
              </div>
              <Button
                variant="destructive"
                className="ml-auto"
                onClick={() => setActiveTab("breached")}
              >
                View Breached Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
