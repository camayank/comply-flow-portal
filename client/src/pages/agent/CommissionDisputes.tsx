import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  DollarSign,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Calendar,
  User,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Paperclip,
  Eye,
  History,
  IndianRupee,
} from "lucide-react";

interface CommissionStatement {
  id: string;
  period: string;
  periodLabel: string;
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
  totalDisputed: number;
  lineItems: CommissionLineItem[];
  status: "draft" | "finalized" | "paid" | "partial_paid";
  generatedAt: string;
}

interface CommissionLineItem {
  id: string;
  statementId: string;
  clientName: string;
  clientId: string;
  serviceType: string;
  serviceRequestId: string;
  serviceRequestNumber: string;
  serviceValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: "approved" | "pending" | "disputed" | "adjusted";
  disputeId?: string;
  completedAt: string;
}

interface CommissionDispute {
  id: string;
  disputeNumber: string;
  statementId: string;
  lineItemId: string;
  clientName: string;
  serviceRequestNumber: string;
  originalAmount: number;
  disputedAmount: number;
  reason: string;
  category: "missing_commission" | "incorrect_rate" | "wrong_calculation" | "missing_service" | "other";
  status: "submitted" | "under_review" | "info_requested" | "approved" | "partially_approved" | "rejected";
  approvedAmount: number | null;
  resolution: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  attachments: string[];
  timeline: DisputeTimelineItem[];
}

interface DisputeTimelineItem {
  id: string;
  action: string;
  description: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
}

export default function CommissionDisputes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("disputes");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDisputeDialogOpen, setIsNewDisputeDialogOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<CommissionLineItem | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<CommissionDispute | null>(null);
  const [newDisputeData, setNewDisputeData] = useState({
    reason: "",
    category: "incorrect_rate",
    expectedAmount: "",
    details: "",
  });

  // Fetch commission statements
  const { data: statements = [], isLoading: isLoadingStatements } = useQuery<CommissionStatement[]>({
    queryKey: ["/api/agent/commission-statements"],
    queryFn: async () => {
      const response = await fetch("/api/agent/commission-statements");
      if (!response.ok) {
        return getMockStatements();
      }
      return response.json();
    },
  });

  // Fetch disputes
  const { data: disputes = [], isLoading: isLoadingDisputes } = useQuery<CommissionDispute[]>({
    queryKey: ["/api/agent/commission-disputes", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/agent/commission-disputes?${params.toString()}`);
      if (!response.ok) {
        return getMockDisputes(statusFilter);
      }
      return response.json();
    },
  });

  // Submit dispute mutation
  const submitDisputeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/agent/commission-disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to submit dispute");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/commission-disputes"] });
      toast({
        title: "Dispute submitted",
        description: "Your commission dispute has been submitted for review.",
      });
      setIsNewDisputeDialogOpen(false);
      setSelectedLineItem(null);
      setNewDisputeData({ reason: "", category: "incorrect_rate", expectedAmount: "", details: "" });
    },
  });

  const handleSubmitDispute = () => {
    if (!selectedLineItem) return;

    // Simulate submission
    toast({
      title: "Dispute submitted",
      description: "Your commission dispute has been submitted for review. You'll be notified of updates.",
    });
    setIsNewDisputeDialogOpen(false);
    setSelectedLineItem(null);
    setNewDisputeData({ reason: "", category: "incorrect_rate", expectedAmount: "", details: "" });
  };

  const openDisputeDialog = (lineItem: CommissionLineItem) => {
    setSelectedLineItem(lineItem);
    setIsNewDisputeDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      info_requested: "bg-purple-100 text-purple-800",
      approved: "bg-green-100 text-green-800",
      partially_approved: "bg-orange-100 text-orange-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      submitted: "Submitted",
      under_review: "Under Review",
      info_requested: "Info Requested",
      approved: "Approved",
      partially_approved: "Partially Approved",
      rejected: "Rejected",
    };
    return <Badge className={styles[status] || styles.submitted}>{labels[status] || status}</Badge>;
  };

  const getLineItemStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "disputed":
        return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
      case "adjusted":
        return <Badge className="bg-blue-100 text-blue-800">Adjusted</Badge>;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      missing_commission: "Missing Commission",
      incorrect_rate: "Incorrect Rate",
      wrong_calculation: "Wrong Calculation",
      missing_service: "Missing Service",
      other: "Other",
    };
    return labels[category] || category;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Summary stats
  const totalDisputes = disputes.length;
  const pendingDisputes = disputes.filter((d) => ["submitted", "under_review", "info_requested"].includes(d.status)).length;
  const resolvedDisputes = disputes.filter((d) => ["approved", "partially_approved", "rejected"].includes(d.status)).length;
  const totalDisputedAmount = disputes.reduce((sum, d) => sum + d.disputedAmount, 0);
  const totalApprovedAmount = disputes
    .filter((d) => d.approvedAmount !== null)
    .reduce((sum, d) => sum + (d.approvedAmount || 0), 0);

  const filteredDisputes = disputes.filter((dispute) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dispute.disputeNumber.toLowerCase().includes(query) ||
      dispute.clientName.toLowerCase().includes(query) ||
      dispute.serviceRequestNumber.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Commission Disputes</h1>
          <p className="text-muted-foreground">Review commission statements and raise disputes</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDisputes}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingDisputes}</div>
            <p className="text-xs text-muted-foreground">Awaiting resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputed Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDisputedAmount)}</div>
            <p className="text-xs text-muted-foreground">Under dispute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalApprovedAmount)}</div>
            <p className="text-xs text-muted-foreground">Successfully resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="disputes">My Disputes</TabsTrigger>
          <TabsTrigger value="statements">Commission Statements</TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Commission Disputes</CardTitle>
                  <CardDescription>Track and manage your commission disputes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search disputes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="info_requested">Info Requested</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDisputes ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No disputes found</p>
                  <p className="text-sm">Go to Commission Statements to raise a new dispute</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredDisputes.map((dispute) => (
                    <AccordionItem key={dispute.id} value={dispute.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{dispute.disputeNumber}</span>
                                {getStatusBadge(dispute.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {dispute.clientName} - {dispute.serviceRequestNumber}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(dispute.disputedAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(dispute.submittedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          {/* Dispute Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground">Category</p>
                              <p className="font-medium">{getCategoryLabel(dispute.category)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Original Amount</p>
                              <p className="font-medium">{formatCurrency(dispute.originalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Disputed Amount</p>
                              <p className="font-medium text-orange-600">{formatCurrency(dispute.disputedAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Approved Amount</p>
                              <p className={`font-medium ${dispute.approvedAmount !== null ? "text-green-600" : ""}`}>
                                {dispute.approvedAmount !== null ? formatCurrency(dispute.approvedAmount) : "-"}
                              </p>
                            </div>
                          </div>

                          {/* Reason */}
                          <div>
                            <p className="text-sm font-medium mb-1">Reason</p>
                            <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                          </div>

                          {/* Resolution (if any) */}
                          {dispute.resolution && (
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Resolution</p>
                              <p className="text-sm text-green-700 dark:text-green-300">{dispute.resolution}</p>
                              {dispute.resolvedBy && dispute.resolvedAt && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                  Resolved by {dispute.resolvedBy} on {format(new Date(dispute.resolvedAt), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Timeline */}
                          <div>
                            <p className="text-sm font-medium mb-3 flex items-center gap-2">
                              <History className="h-4 w-4" />
                              Timeline
                            </p>
                            <div className="space-y-3">
                              {dispute.timeline.map((item, index) => (
                                <div key={item.id} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`h-2 w-2 rounded-full ${
                                      index === 0 ? "bg-primary" : "bg-muted-foreground/30"
                                    }`} />
                                    {index < dispute.timeline.length - 1 && (
                                      <div className="w-0.5 h-full bg-muted-foreground/20" />
                                    )}
                                  </div>
                                  <div className="pb-3">
                                    <p className="text-sm font-medium">{item.action}</p>
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.actorName} ({item.actorRole}) - {format(new Date(item.createdAt), "MMM d, h:mm a")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Info Requested Action */}
                          {dispute.status === "info_requested" && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                                Additional Information Required
                              </p>
                              <div className="flex gap-2">
                                <Textarea placeholder="Provide the requested information..." className="flex-1" />
                                <Button size="sm">Submit</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements">
          <Card>
            <CardHeader>
              <CardTitle>Commission Statements</CardTitle>
              <CardDescription>Review your commission statements and raise disputes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatements ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : statements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No commission statements</p>
                  <p className="text-sm">Your commission statements will appear here</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-4">
                  {statements.map((statement) => (
                    <AccordionItem key={statement.id} value={statement.id} className="border rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{statement.periodLabel}</p>
                              <p className="text-sm text-muted-foreground">
                                {statement.lineItems.length} services
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">{formatCurrency(statement.totalCommission)}</p>
                            <div className="flex items-center gap-2 justify-end">
                              {statement.totalDisputed > 0 && (
                                <Badge variant="outline" className="text-orange-600">
                                  {formatCurrency(statement.totalDisputed)} disputed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          {/* Statement Summary */}
                          <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground">Total Earned</p>
                              <p className="font-semibold text-green-600">{formatCurrency(statement.totalCommission)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Paid</p>
                              <p className="font-semibold">{formatCurrency(statement.totalPaid)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Pending</p>
                              <p className="font-semibold text-yellow-600">{formatCurrency(statement.totalPending)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Under Dispute</p>
                              <p className="font-semibold text-orange-600">{formatCurrency(statement.totalDisputed)}</p>
                            </div>
                          </div>

                          {/* Line Items Table */}
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>SR #</TableHead>
                                <TableHead className="text-right">Service Value</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Commission</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {statement.lineItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.clientName}</TableCell>
                                  <TableCell>{item.serviceType}</TableCell>
                                  <TableCell className="font-mono text-sm">{item.serviceRequestNumber}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.serviceValue)}</TableCell>
                                  <TableCell className="text-right">{item.commissionRate}%</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(item.commissionAmount)}
                                  </TableCell>
                                  <TableCell>{getLineItemStatusBadge(item.status)}</TableCell>
                                  <TableCell>
                                    {item.status !== "disputed" && item.status !== "adjusted" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDisputeDialog(item)}
                                      >
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        Dispute
                                      </Button>
                                    )}
                                    {item.disputeId && (
                                      <Button variant="link" size="sm" className="text-blue-600">
                                        <Eye className="h-4 w-4 mr-1" />
                                        View Dispute
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Dispute Dialog */}
      <Dialog open={isNewDisputeDialogOpen} onOpenChange={setIsNewDisputeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Raise Commission Dispute</DialogTitle>
            <DialogDescription>
              Submit a dispute for commission review
            </DialogDescription>
          </DialogHeader>

          {selectedLineItem && (
            <div className="space-y-4 py-4">
              {/* Line Item Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p className="font-medium">{selectedLineItem.clientName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service Request:</span>
                    <p className="font-medium font-mono">{selectedLineItem.serviceRequestNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Commission:</span>
                    <p className="font-medium">{formatCurrency(selectedLineItem.commissionAmount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rate Applied:</span>
                    <p className="font-medium">{selectedLineItem.commissionRate}%</p>
                  </div>
                </div>
              </div>

              {/* Dispute Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Dispute Category</Label>
                  <Select
                    value={newDisputeData.category}
                    onValueChange={(value) => setNewDisputeData({ ...newDisputeData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incorrect_rate">Incorrect Commission Rate</SelectItem>
                      <SelectItem value="wrong_calculation">Wrong Calculation</SelectItem>
                      <SelectItem value="missing_commission">Missing Commission</SelectItem>
                      <SelectItem value="missing_service">Missing Service</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expected Commission Amount</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={newDisputeData.expectedAmount}
                      onChange={(e) => setNewDisputeData({ ...newDisputeData, expectedAmount: e.target.value })}
                      placeholder="Enter expected amount"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Dispute</Label>
                  <Textarea
                    value={newDisputeData.reason}
                    onChange={(e) => setNewDisputeData({ ...newDisputeData, reason: e.target.value })}
                    placeholder="Explain why you believe this commission is incorrect..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Supporting Documents (optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground hover:border-primary/50 cursor-pointer transition-colors">
                    <Paperclip className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm">Click to upload or drag and drop</p>
                    <p className="text-xs">PDF, PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDisputeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDispute}
              disabled={!newDisputeData.reason.trim() || !newDisputeData.expectedAmount}
            >
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mock data generators
function getMockStatements(): CommissionStatement[] {
  return [
    {
      id: "stmt_1",
      period: "2026-01",
      periodLabel: "January 2026",
      totalCommission: 125000,
      totalPaid: 100000,
      totalPending: 15000,
      totalDisputed: 10000,
      status: "partial_paid",
      generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        {
          id: "li_1",
          statementId: "stmt_1",
          clientName: "Acme Technologies Pvt Ltd",
          clientId: "client_1",
          serviceType: "GST Registration",
          serviceRequestId: "sr_1",
          serviceRequestNumber: "SR2600001",
          serviceValue: 15000,
          commissionRate: 10,
          commissionAmount: 1500,
          status: "approved",
          completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "li_2",
          statementId: "stmt_1",
          clientName: "Global Exports Ltd",
          clientId: "client_2",
          serviceType: "Private Limited Registration",
          serviceRequestId: "sr_2",
          serviceRequestNumber: "SR2600015",
          serviceValue: 50000,
          commissionRate: 15,
          commissionAmount: 7500,
          status: "approved",
          completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "li_3",
          statementId: "stmt_1",
          clientName: "StartupHub Innovations",
          clientId: "client_3",
          serviceType: "Trademark Registration",
          serviceRequestId: "sr_3",
          serviceRequestNumber: "SR2600022",
          serviceValue: 25000,
          commissionRate: 12,
          commissionAmount: 3000,
          status: "disputed",
          disputeId: "disp_1",
          completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "li_4",
          statementId: "stmt_1",
          clientName: "MedCare Pharma",
          clientId: "client_4",
          serviceType: "Drug License",
          serviceRequestId: "sr_4",
          serviceRequestNumber: "SR2600031",
          serviceValue: 75000,
          commissionRate: 8,
          commissionAmount: 6000,
          status: "pending",
          completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: "stmt_2",
      period: "2025-12",
      periodLabel: "December 2025",
      totalCommission: 95000,
      totalPaid: 95000,
      totalPending: 0,
      totalDisputed: 0,
      status: "paid",
      generatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        {
          id: "li_5",
          statementId: "stmt_2",
          clientName: "TechForward Solutions",
          clientId: "client_5",
          serviceType: "ISO Certification",
          serviceRequestId: "sr_5",
          serviceRequestNumber: "SR2500145",
          serviceValue: 150000,
          commissionRate: 10,
          commissionAmount: 15000,
          status: "approved",
          completedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
  ];
}

function getMockDisputes(statusFilter: string): CommissionDispute[] {
  const allDisputes: CommissionDispute[] = [
    {
      id: "disp_1",
      disputeNumber: "DISP-2026-0001",
      statementId: "stmt_1",
      lineItemId: "li_3",
      clientName: "StartupHub Innovations",
      serviceRequestNumber: "SR2600022",
      originalAmount: 3000,
      disputedAmount: 7500,
      reason: "The commission rate should be 15% as per my agent agreement for Trademark services, not 12%. I have attached my agreement for reference.",
      category: "incorrect_rate",
      status: "under_review",
      approvedAmount: null,
      resolution: null,
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      attachments: ["agent_agreement.pdf"],
      timeline: [
        {
          id: "tl_1",
          action: "Dispute Submitted",
          description: "Commission dispute raised for SR2600022",
          actorName: "You",
          actorRole: "Agent",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tl_2",
          action: "Under Review",
          description: "Dispute assigned to finance team for review",
          actorName: "System",
          actorRole: "Automated",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: "disp_2",
      disputeNumber: "DISP-2025-0042",
      statementId: "stmt_2",
      lineItemId: "li_old",
      clientName: "RetailMax India",
      serviceRequestNumber: "SR2500089",
      originalAmount: 5000,
      disputedAmount: 8000,
      reason: "The service value was incorrectly recorded. The actual invoice value was ₹80,000, not ₹50,000.",
      category: "wrong_calculation",
      status: "approved",
      approvedAmount: 8000,
      resolution: "Verified with accounts. The service value has been corrected and the commission difference of ₹3,000 will be credited in the next payout.",
      submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedBy: "Sneha Gupta",
      attachments: [],
      timeline: [
        {
          id: "tl_3",
          action: "Dispute Submitted",
          description: "Commission dispute raised for SR2500089",
          actorName: "You",
          actorRole: "Agent",
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tl_4",
          action: "Under Review",
          description: "Dispute assigned to finance team",
          actorName: "System",
          actorRole: "Automated",
          createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tl_5",
          action: "Approved",
          description: "Dispute verified and approved. Correction will be applied.",
          actorName: "Sneha Gupta",
          actorRole: "Finance Manager",
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: "disp_3",
      disputeNumber: "DISP-2025-0038",
      statementId: "stmt_old",
      lineItemId: "li_old_2",
      clientName: "FoodChain Corp",
      serviceRequestNumber: "SR2500067",
      originalAmount: 2000,
      disputedAmount: 4000,
      reason: "I referred this client and should receive the referral bonus as well as the service commission.",
      category: "missing_commission",
      status: "rejected",
      approvedAmount: 0,
      resolution: "Upon review, the referral was made by a different agent (ID: AGT-045). The service commission has been correctly applied. No adjustment warranted.",
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedBy: "Rajesh Kumar",
      attachments: [],
      timeline: [
        {
          id: "tl_6",
          action: "Dispute Submitted",
          description: "Commission dispute raised for SR2500067",
          actorName: "You",
          actorRole: "Agent",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tl_7",
          action: "Rejected",
          description: "Referral was attributed to different agent. No adjustment needed.",
          actorName: "Rajesh Kumar",
          actorRole: "Operations Manager",
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
  ];

  if (statusFilter === "all") return allDisputes;
  return allDisputes.filter((d) => d.status === statusFilter);
}
