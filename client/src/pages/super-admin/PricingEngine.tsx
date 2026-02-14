import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout, PageShell, MetricCard } from "@/components/v3";
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
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Percent,
  Tag,
  Calendar,
  Crown,
  LayoutDashboard,
  Building2,
  Briefcase,
  ShieldCheck,
  Settings,
  BarChart3,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PricingRule {
  id: number;
  serviceId: number | null;
  tenantId: number | null;
  ruleType: string; // base, volume, promo, seasonal, loyalty
  name: string;
  conditions: any;
  adjustment: { type: "percentage" | "fixed"; value: number };
  priority: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

interface PriceCalculation {
  basePrice: number;
  appliedRules: { name: string; adjustment: number }[];
  finalPrice: number;
}

const RULE_TYPES = [
  { value: "base", label: "Base Price", color: "bg-blue-100 text-blue-700" },
  { value: "volume", label: "Volume Discount", color: "bg-green-100 text-green-700" },
  { value: "promo", label: "Promotional", color: "bg-purple-100 text-purple-700" },
  { value: "seasonal", label: "Seasonal", color: "bg-orange-100 text-orange-700" },
  { value: "loyalty", label: "Loyalty", color: "bg-amber-100 text-amber-700" },
];

const emptyRule: Omit<PricingRule, "id"> = {
  serviceId: null,
  tenantId: null,
  ruleType: "base",
  name: "",
  conditions: {},
  adjustment: { type: "percentage", value: 0 },
  priority: 1,
  effectiveFrom: null,
  effectiveTo: null,
  isActive: true,
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

export default function PricingEngine() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<Omit<PricingRule, "id">>(emptyRule);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Calculator state
  const [calcServiceId, setCalcServiceId] = useState<string>("");
  const [calcTenantId, setCalcTenantId] = useState<string>("");
  const [calcBasePrice, setCalcBasePrice] = useState<string>("");

  // Fetch pricing rules
  const { data: rules = [], isLoading } = useQuery<PricingRule[]>({
    queryKey: ["/api/super-admin/pricing-rules"],
  });

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<PricingRule, "id">) =>
      apiRequest<PricingRule>("/api/super-admin/pricing-rules", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pricing-rules"] });
      toast({ title: "Success", description: "Pricing rule created successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PricingRule> }) =>
      apiRequest<PricingRule>(`/api/super-admin/pricing-rules/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pricing-rules"] });
      toast({ title: "Success", description: "Pricing rule updated successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/api/super-admin/pricing-rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/pricing-rules"] });
      toast({ title: "Success", description: "Pricing rule deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedRule(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate price mutation
  const calculateMutation = useMutation({
    mutationFn: (data: { serviceId?: number; tenantId?: number; basePrice: number }) =>
      apiRequest<PriceCalculation>("/api/super-admin/pricing/calculate", {
        method: "POST",
        body: data,
      }),
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setSelectedRule(null);
    setFormData(emptyRule);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      serviceId: rule.serviceId,
      tenantId: rule.tenantId,
      ruleType: rule.ruleType,
      name: rule.name,
      conditions: rule.conditions,
      adjustment: rule.adjustment,
      priority: rule.priority,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRule(null);
    setFormData(emptyRule);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Rule name is required", variant: "destructive" });
      return;
    }

    if (selectedRule) {
      updateMutation.mutate({ id: selectedRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (rule: PricingRule) => {
    setSelectedRule(rule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRule) {
      deleteMutation.mutate(selectedRule.id);
    }
  };

  const handleCalculate = () => {
    const basePrice = parseFloat(calcBasePrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      toast({ title: "Error", description: "Please enter a valid base price", variant: "destructive" });
      return;
    }

    calculateMutation.mutate({
      serviceId: calcServiceId ? parseInt(calcServiceId) : undefined,
      tenantId: calcTenantId ? parseInt(calcTenantId) : undefined,
      basePrice,
    });
  };

  const getRuleTypeConfig = (type: string) => {
    return RULE_TYPES.find((t) => t.value === type) || RULE_TYPES[0];
  };

  const formatAdjustment = (adjustment: { type: string; value: number }) => {
    if (adjustment.type === "percentage") {
      return `${adjustment.value > 0 ? "+" : ""}${adjustment.value}%`;
    }
    return `${adjustment.value > 0 ? "+" : ""}$${Math.abs(adjustment.value).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    if (filterType !== "all" && rule.ruleType !== filterType) return false;
    if (filterStatus === "active" && !rule.isActive) return false;
    if (filterStatus === "inactive" && rule.isActive) return false;
    return true;
  });

  // Compute stats
  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.isActive).length,
    promoRules: rules.filter((r) => r.ruleType === "promo").length,
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
        title="Pricing Engine"
        subtitle="Manage pricing rules and discounts"
        breadcrumbs={[{ label: "Super Admin", href: "/super-admin/dashboard" }, { label: "Pricing" }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Total Rules"
              value={stats.totalRules.toString()}
              trend={{ value: "All pricing rules", direction: "neutral" }}
              icon={DollarSign}
              accentColor="blue"
            />
            <MetricCard
              label="Active Rules"
              value={stats.activeRules.toString()}
              trend={{ value: "Currently enabled", direction: "up" }}
              icon={CheckCircle}
              accentColor="green"
            />
            <MetricCard
              label="Promotional"
              value={stats.promoRules.toString()}
              trend={{ value: "Active promotions", direction: "neutral" }}
              icon={Tag}
              accentColor="purple"
            />
          </div>

          {/* Filter Bar */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-slate-500" />
                  <Label className="text-slate-600">Rule Type:</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40 bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-600">Status:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto text-sm text-slate-600">
                  {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""} found
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Rules Table */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-600" />
                Pricing Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-600">Loading pricing rules...</div>
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-900 font-medium">No Pricing Rules</p>
                  <p className="text-sm text-slate-600">
                    {rules.length === 0
                      ? "Create your first pricing rule to get started"
                      : "No rules match your current filters"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-50">
                      <TableHead className="text-slate-600">Name</TableHead>
                      <TableHead className="text-slate-600">Type</TableHead>
                      <TableHead className="text-slate-600">Adjustment</TableHead>
                      <TableHead className="text-slate-600">Priority</TableHead>
                      <TableHead className="text-slate-600">Effective Period</TableHead>
                      <TableHead className="text-slate-600">Status</TableHead>
                      <TableHead className="text-slate-600 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => {
                      const typeConfig = getRuleTypeConfig(rule.ruleType);
                      return (
                        <TableRow
                          key={rule.id}
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          <TableCell className="text-slate-900 font-medium">
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-900">
                            <span
                              className={
                                rule.adjustment.value < 0
                                  ? "text-red-600"
                                  : rule.adjustment.value > 0
                                  ? "text-emerald-600"
                                  : "text-slate-900"
                              }
                            >
                              {formatAdjustment(rule.adjustment)}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600">{rule.priority}</TableCell>
                          <TableCell className="text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {rule.effectiveFrom || rule.effectiveTo ? (
                                <span>
                                  {formatDate(rule.effectiveFrom)} - {formatDate(rule.effectiveTo)}
                                </span>
                              ) : (
                                <span>Always</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rule.isActive
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }
                            >
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(rule)}
                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(rule)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Price Calculator */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Price Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-slate-600">Service ID (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Enter service ID"
                    value={calcServiceId}
                    onChange={(e) => setCalcServiceId(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Tenant ID (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Enter tenant ID"
                    value={calcTenantId}
                    onChange={(e) => setCalcTenantId(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Base Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter base price"
                    value={calcBasePrice}
                    onChange={(e) => setCalcBasePrice(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <Button
                  onClick={handleCalculate}
                  disabled={calculateMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {calculateMutation.isPending ? "Calculating..." : "Calculate Price"}
                </Button>
              </div>

              {/* Calculation Result */}
              {calculateMutation.data && (
                <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-slate-600">Base Price</p>
                      <p className="text-2xl font-bold text-slate-900">
                        ${calculateMutation.data.basePrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Applied Rules</p>
                      <div className="space-y-1 mt-1">
                        {calculateMutation.data.appliedRules.length > 0 ? (
                          calculateMutation.data.appliedRules.map((rule, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-slate-600">{rule.name}</span>
                              <span
                                className={
                                  rule.adjustment < 0 ? "text-red-600" : "text-emerald-600"
                                }
                              >
                                {rule.adjustment > 0 ? "+" : ""}${rule.adjustment.toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-600">No rules applied</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Final Price</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${calculateMutation.data.finalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {selectedRule ? "Edit Pricing Rule" : "Create Pricing Rule"}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                {selectedRule
                  ? "Update the pricing rule details below"
                  : "Configure a new pricing rule for your services"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Rule Name</Label>
                <Input
                  placeholder="Enter rule name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Rule Type</Label>
                  <Select
                    value={formData.ruleType}
                    onValueChange={(value) => setFormData({ ...formData, ruleType: value })}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Priority</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                    }
                    className="bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Adjustment Type</Label>
                  <Select
                    value={formData.adjustment.type}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setFormData({
                        ...formData,
                        adjustment: { ...formData.adjustment, type: value },
                      })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Adjustment Value</Label>
                  <Input
                    type="number"
                    step={formData.adjustment.type === "percentage" ? "1" : "0.01"}
                    value={formData.adjustment.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        adjustment: {
                          ...formData.adjustment,
                          value: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Service ID (optional)</Label>
                  <Input
                    type="number"
                    placeholder="All services"
                    value={formData.serviceId ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serviceId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Tenant ID (optional)</Label>
                  <Input
                    type="number"
                    placeholder="All tenants"
                    value={formData.tenantId ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tenantId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Effective From</Label>
                  <Input
                    type="date"
                    value={formData.effectiveFrom ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effectiveFrom: e.target.value || null,
                      })
                    }
                    className="bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Effective To</Label>
                  <Input
                    type="date"
                    value={formData.effectiveTo ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effectiveTo: e.target.value || null,
                      })
                    }
                    className="bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="isActive" className="cursor-pointer text-slate-700">
                  Rule is active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : selectedRule
                  ? "Update Rule"
                  : "Create Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Pricing Rule</DialogTitle>
              <DialogDescription className="text-slate-600">
                Are you sure you want to delete the rule "{selectedRule?.name}"? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
