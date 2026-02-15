import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts";
import { PageShell, MetricCard, EmptyState } from "@/components/v3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CommissionRule {
  id: number;
  name: string;
  agentTier: string | null;
  serviceCategory: string | null;
  serviceId: number | null;
  basePercentage: number;
  volumeBonuses: { threshold: number; bonusPercentage: number }[];
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

interface CommissionPayout {
  id: number;
  agentId: number;
  agentName?: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  commissionAmount: number;
  bonusAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  paidAt: string | null;
}

type RuleFormData = Omit<CommissionRule, "id">;

const initialRuleForm: RuleFormData = {
  name: "",
  agentTier: null,
  serviceCategory: null,
  serviceId: null,
  basePercentage: 0,
  volumeBonuses: [],
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveTo: null,
  isActive: true,
};

export default function CommissionConfig() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rules");
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormData>(initialRuleForm);

  // Fetch commission rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery<CommissionRule[]>({
    queryKey: ["/api/super-admin/commission-rules"],
  });

  // Fetch commission payouts
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<CommissionPayout[]>({
    queryKey: ["/api/super-admin/commission-payouts"],
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (data: RuleFormData) =>
      apiRequest<CommissionRule>("/api/super-admin/commission-rules", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/commission-rules"] });
      toast({ title: "Success", description: "Commission rule created successfully" });
      closeRuleDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RuleFormData }) =>
      apiRequest<CommissionRule>(`/api/super-admin/commission-rules/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/commission-rules"] });
      toast({ title: "Success", description: "Commission rule updated successfully" });
      closeRuleDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/api/super-admin/commission-rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/commission-rules"] });
      toast({ title: "Success", description: "Commission rule deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Approve payout mutation
  const approvePayoutMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest<CommissionPayout>(`/api/super-admin/commission-payouts/${id}/approve`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/commission-payouts"] });
      toast({ title: "Success", description: "Payout approved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest<CommissionPayout>(`/api/super-admin/commission-payouts/${id}/mark-paid`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/commission-payouts"] });
      toast({ title: "Success", description: "Payout marked as paid" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-amber-100 text-amber-700 border-amber-200", label: "Pending" },
      approved: { className: "bg-blue-100 text-blue-700 border-blue-200", label: "Approved" },
      paid: { className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Paid" },
      disputed: { className: "bg-red-100 text-red-700 border-red-200", label: "Disputed" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTierBadge = (tier: string | null) => {
    if (!tier) return null;
    const tierConfig: Record<string, string> = {
      silver: "bg-slate-100 text-slate-700 border-slate-200",
      gold: "bg-amber-100 text-amber-700 border-amber-200",
      platinum: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return (
      <Badge className={tierConfig[tier.toLowerCase()] || tierConfig.silver}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    setRuleForm(initialRuleForm);
    setIsRuleDialogOpen(true);
  };

  const openEditDialog = (rule: CommissionRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      agentTier: rule.agentTier,
      serviceCategory: rule.serviceCategory,
      serviceId: rule.serviceId,
      basePercentage: rule.basePercentage,
      volumeBonuses: rule.volumeBonuses || [],
      effectiveFrom: rule.effectiveFrom.split("T")[0],
      effectiveTo: rule.effectiveTo ? rule.effectiveTo.split("T")[0] : null,
      isActive: rule.isActive,
    });
    setIsRuleDialogOpen(true);
  };

  const closeRuleDialog = () => {
    setIsRuleDialogOpen(false);
    setEditingRule(null);
    setRuleForm(initialRuleForm);
  };

  const handleSaveRule = () => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: ruleForm });
    } else {
      createRuleMutation.mutate(ruleForm);
    }
  };

  const handleDeleteRule = (id: number) => {
    if (confirm("Are you sure you want to delete this commission rule?")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const addVolumeBonus = () => {
    setRuleForm({
      ...ruleForm,
      volumeBonuses: [...ruleForm.volumeBonuses, { threshold: 0, bonusPercentage: 0 }],
    });
  };

  const updateVolumeBonus = (index: number, field: "threshold" | "bonusPercentage", value: number) => {
    const updatedBonuses = [...ruleForm.volumeBonuses];
    updatedBonuses[index] = { ...updatedBonuses[index], [field]: value };
    setRuleForm({ ...ruleForm, volumeBonuses: updatedBonuses });
  };

  const removeVolumeBonus = (index: number) => {
    setRuleForm({
      ...ruleForm,
      volumeBonuses: ruleForm.volumeBonuses.filter((_, i) => i !== index),
    });
  };

  return (
    <DashboardLayout>
      <PageShell
        title="Commission Configuration"
        subtitle="Manage commission rules and agent payouts"
        breadcrumbs={[{ label: "Super Admin", href: "/super-admin/dashboard" }, { label: "Commissions" }]}
        actions={
          <Button
            onClick={openCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              label="Active Rules"
              value={rules.filter((r) => r.isActive).length.toString()}
              trend={{ value: `of ${rules.length} total rules`, direction: "neutral" }}
              icon={Percent}
              accentColor="green"
            />
            <MetricCard
              label="Pending Payouts"
              value={payouts.filter((p) => p.status === "pending").length.toString()}
              trend={{ value: "awaiting approval", direction: "neutral" }}
              icon={Clock}
              accentColor="orange"
            />
            <MetricCard
              label="Total Commission"
              value={formatCurrency(payouts.reduce((sum, p) => sum + p.netAmount, 0))}
              trend={{ value: "all time", direction: "up" }}
              icon={DollarSign}
              accentColor="green"
            />
            <MetricCard
              label="Active Agents"
              value={new Set(payouts.map((p) => p.agentId)).size.toString()}
              trend={{ value: "earning commission", direction: "neutral" }}
              icon={Users}
              accentColor="blue"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger
                value="rules"
                className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
              >
                <Percent className="h-4 w-4 mr-2" />
                Commission Rules
              </TabsTrigger>
              <TabsTrigger
                value="payouts"
                className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Payouts
              </TabsTrigger>
            </TabsList>

            {/* Commission Rules Tab */}
            <TabsContent value="rules">
              <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      Commission Rules
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {rulesLoading ? (
                    <div className="text-center py-8 text-slate-600">Loading rules...</div>
                  ) : rules.length === 0 ? (
                    <EmptyState
                      icon={Percent}
                      title="No Commission Rules"
                      description="Create your first commission rule to get started"
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-slate-50">
                          <TableHead className="text-slate-600">Name</TableHead>
                          <TableHead className="text-slate-600">Agent Tier</TableHead>
                          <TableHead className="text-slate-600">Category</TableHead>
                          <TableHead className="text-slate-600">Base %</TableHead>
                          <TableHead className="text-slate-600">Volume Bonuses</TableHead>
                          <TableHead className="text-slate-600">Effective</TableHead>
                          <TableHead className="text-slate-600">Status</TableHead>
                          <TableHead className="text-slate-600">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((rule) => (
                          <TableRow key={rule.id} className="border-slate-200 hover:bg-slate-50">
                            <TableCell className="text-slate-900 font-medium">{rule.name}</TableCell>
                            <TableCell>{getTierBadge(rule.agentTier) || <span className="text-slate-600">All</span>}</TableCell>
                            <TableCell className="text-slate-600">{rule.serviceCategory || "All"}</TableCell>
                            <TableCell className="text-slate-900">{rule.basePercentage}%</TableCell>
                            <TableCell className="text-slate-600">
                              {rule.volumeBonuses?.length > 0
                                ? rule.volumeBonuses.map((vb) => `${formatCurrency(vb.threshold)}+${vb.bonusPercentage}%`).join(", ")
                                : "None"}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {formatDate(rule.effectiveFrom)}
                              {rule.effectiveTo && ` - ${formatDate(rule.effectiveTo)}`}
                            </TableCell>
                            <TableCell>
                              <Badge className={rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                                {rule.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(rule)}
                                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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

            {/* Payouts Tab */}
            <TabsContent value="payouts">
              <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Commission Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payoutsLoading ? (
                    <div className="text-center py-8 text-slate-600">Loading payouts...</div>
                  ) : payouts.length === 0 ? (
                    <EmptyState
                      icon={DollarSign}
                      title="No Payouts"
                      description="Commission payouts will appear here"
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-slate-50">
                          <TableHead className="text-slate-600">Agent</TableHead>
                          <TableHead className="text-slate-600">Period</TableHead>
                          <TableHead className="text-slate-600">Total Sales</TableHead>
                          <TableHead className="text-slate-600">Commission</TableHead>
                          <TableHead className="text-slate-600">Bonus</TableHead>
                          <TableHead className="text-slate-600">Deductions</TableHead>
                          <TableHead className="text-slate-600">Net Amount</TableHead>
                          <TableHead className="text-slate-600">Status</TableHead>
                          <TableHead className="text-slate-600">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id} className="border-slate-200 hover:bg-slate-50">
                            <TableCell className="text-slate-900 font-medium">
                              {payout.agentName || `Agent #${payout.agentId}`}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                            </TableCell>
                            <TableCell className="text-slate-900">{formatCurrency(payout.totalSales)}</TableCell>
                            <TableCell className="text-emerald-600">{formatCurrency(payout.commissionAmount)}</TableCell>
                            <TableCell className="text-blue-600">{formatCurrency(payout.bonusAmount)}</TableCell>
                            <TableCell className="text-red-600">-{formatCurrency(payout.deductions)}</TableCell>
                            <TableCell className="text-slate-900 font-semibold">{formatCurrency(payout.netAmount)}</TableCell>
                            <TableCell>{getStatusBadge(payout.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {payout.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => approvePayoutMutation.mutate(payout.id)}
                                    disabled={approvePayoutMutation.isPending}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                {payout.status === "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markPaidMutation.mutate(payout.id)}
                                    disabled={markPaidMutation.isPending}
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}
                                {payout.status === "paid" && payout.paidAt && (
                                  <span className="text-xs text-slate-600">
                                    Paid: {formatDate(payout.paidAt)}
                                  </span>
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
        </div>

        {/* Rule Dialog */}
        <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
          <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {editingRule ? "Edit Commission Rule" : "Create Commission Rule"}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Configure commission rates and volume bonuses for agents.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Rule Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">Rule Name</Label>
                <Input
                  id="name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="e.g., Gold Tier - Premium Services"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Agent Tier and Service Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Agent Tier</Label>
                  <Select
                    value={ruleForm.agentTier || "all"}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, agentTier: value === "all" ? null : value })}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Service Category</Label>
                  <Select
                    value={ruleForm.serviceCategory || "all"}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, serviceCategory: value === "all" ? null : value })}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="fssai">FSSAI</SelectItem>
                      <SelectItem value="gst">GST</SelectItem>
                      <SelectItem value="trademark">Trademark</SelectItem>
                      <SelectItem value="company">Company Registration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Base Percentage */}
              <div className="space-y-2">
                <Label htmlFor="basePercentage" className="text-slate-700">Base Commission (%)</Label>
                <Input
                  id="basePercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={ruleForm.basePercentage}
                  onChange={(e) => setRuleForm({ ...ruleForm, basePercentage: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>

              {/* Volume Bonuses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">Volume Bonuses</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVolumeBonus}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Bonus
                  </Button>
                </div>
                {ruleForm.volumeBonuses.length === 0 ? (
                  <p className="text-sm text-slate-600">No volume bonuses configured</p>
                ) : (
                  <div className="space-y-3">
                    {ruleForm.volumeBonuses.map((bonus, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <Label className="text-xs text-slate-600">Threshold ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={bonus.threshold}
                            onChange={(e) => updateVolumeBonus(index, "threshold", parseFloat(e.target.value) || 0)}
                            className="bg-white border-slate-200 text-slate-900 mt-1"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-slate-600">Bonus (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={bonus.bonusPercentage}
                            onChange={(e) => updateVolumeBonus(index, "bonusPercentage", parseFloat(e.target.value) || 0)}
                            className="bg-white border-slate-200 text-slate-900 mt-1"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVolumeBonus(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Effective Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effectiveFrom" className="text-slate-700">Effective From</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={ruleForm.effectiveFrom}
                    onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveTo" className="text-slate-700">Effective To (Optional)</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    value={ruleForm.effectiveTo || ""}
                    onChange={(e) => setRuleForm({ ...ruleForm, effectiveTo: e.target.value || null })}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={ruleForm.isActive}
                  onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 bg-white"
                />
                <Label htmlFor="isActive" className="text-slate-700">Rule is active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeRuleDialog}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRule}
                disabled={!ruleForm.name || createRuleMutation.isPending || updateRuleMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createRuleMutation.isPending || updateRuleMutation.isPending ? "Saving..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
