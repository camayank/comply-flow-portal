import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout, PageShell, MetricCard } from "@/components/v3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  Flag,
  ToggleLeft,
  Plus,
  Edit,
  Trash2,
  Activity,
  Percent,
  Crown,
  LayoutDashboard,
  Building2,
  Briefcase,
  DollarSign,
  ShieldCheck,
  BarChart3,
  FileText,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  conditions: { tenants?: number[]; users?: number[]; roles?: string[] } | null;
  createdAt: string;
}

interface SystemHealth {
  database: {
    status: "healthy" | "degraded" | "down";
    responseTime: number;
    connections: number;
    maxConnections: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  apiLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  lastChecked: string;
}

interface FeatureFlagFormData {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
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

export default function Operations() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("feature-flags");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState<FeatureFlagFormData>({
    key: "",
    name: "",
    description: "",
    enabled: false,
    rolloutPercentage: 100,
  });

  // Fetch feature flags
  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/super-admin/operations/feature-flags"],
  });

  // Fetch system health
  const { data: health, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/super-admin/health"],
    refetchInterval: 30000,
  });

  // Create feature flag mutation
  const createFlagMutation = useMutation({
    mutationFn: async (data: FeatureFlagFormData) => {
      return apiRequest("POST", "/api/super-admin/operations/feature-flags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/operations/feature-flags"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Feature Flag Created",
        description: "The feature flag has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create feature flag.",
        variant: "destructive",
      });
    },
  });

  // Update feature flag mutation
  const updateFlagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FeatureFlagFormData }) => {
      return apiRequest("PUT", `/api/super-admin/operations/feature-flags/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/operations/feature-flags"] });
      setIsEditDialogOpen(false);
      setSelectedFlag(null);
      resetForm();
      toast({
        title: "Feature Flag Updated",
        description: "The feature flag has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feature flag.",
        variant: "destructive",
      });
    },
  });

  // Toggle feature flag mutation
  const toggleFlagMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/super-admin/operations/feature-flags/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/operations/feature-flags"] });
      toast({
        title: "Feature Flag Toggled",
        description: "The feature flag status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle feature flag.",
        variant: "destructive",
      });
    },
  });

  // Delete feature flag mutation
  const deleteFlagMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/super-admin/operations/feature-flags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/operations/feature-flags"] });
      setIsDeleteDialogOpen(false);
      setSelectedFlag(null);
      toast({
        title: "Feature Flag Deleted",
        description: "The feature flag has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete feature flag.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      name: "",
      description: "",
      enabled: false,
      rolloutPercentage: 100,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFlagMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFlag) {
      updateFlagMutation.mutate({ id: selectedFlag.id, data: formData });
    }
  };

  const openEditDialog = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description || "",
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setIsDeleteDialogOpen(true);
  };

  const handleToggle = (flag: FeatureFlag) => {
    toggleFlagMutation.mutate(flag.id);
  };

  const handleDelete = () => {
    if (selectedFlag) {
      deleteFlagMutation.mutate(selectedFlag.id);
    }
  };

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "down":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "degraded":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "down":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
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
        title="Operations"
        subtitle="Feature flags and system health management"
        breadcrumbs={[{ label: "Super Admin", href: "/super-admin/dashboard" }, { label: "Operations" }]}
        actions={
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Flag
          </Button>
        }
      >
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger
                value="feature-flags"
                className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
              >
                <Flag className="h-4 w-4 mr-2" />
                Feature Flags
              </TabsTrigger>
              <TabsTrigger
                value="system-health"
                className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
              >
                <Activity className="h-4 w-4 mr-2" />
                System Health
              </TabsTrigger>
            </TabsList>

            {/* Feature Flags Tab */}
            <TabsContent value="feature-flags" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Feature Flags</h2>
              </div>

              {flagsLoading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-white border-slate-200 animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : featureFlags.length === 0 ? (
                <Card className="bg-white border-slate-200">
                  <CardContent className="py-12 text-center">
                    <Flag className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Feature Flags</h3>
                    <p className="text-slate-600 mb-4">
                      Create your first feature flag to control feature rollouts
                    </p>
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Flag
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {featureFlags.map((flag) => (
                    <Card
                      key={flag.id}
                      className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">{flag.name}</h3>
                              <Badge
                                variant="outline"
                                className={
                                  flag.enabled
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }
                              >
                                {flag.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              <code className="bg-slate-100 px-2 py-1 rounded text-slate-700">{flag.key}</code>
                            </p>
                            {flag.description && (
                              <p className="text-sm text-slate-600 mb-3">{flag.description}</p>
                            )}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  Rollout: {flag.rolloutPercentage}%
                                </span>
                              </div>
                              <div className="flex-1 max-w-xs">
                                <Progress
                                  value={flag.rolloutPercentage}
                                  className="h-2 bg-slate-200"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={flag.enabled}
                                onCheckedChange={() => handleToggle(flag)}
                                disabled={toggleFlagMutation.isPending}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <ToggleLeft className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(flag)}
                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(flag)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* System Health Tab */}
            <TabsContent value="system-health" className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">System Health</h2>

              {healthLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-white border-slate-200 animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-slate-200 rounded w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-8 bg-slate-200 rounded w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : health ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Database Status Card */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-medium text-slate-900">
                        Database Status
                      </CardTitle>
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(
                          health.database.status
                        )}`}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Status</span>
                        <Badge
                          variant="outline"
                          className={getStatusBadge(health.database.status)}
                        >
                          {health.database.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Response Time</span>
                        <span className="text-slate-900 font-medium">
                          {health.database.responseTime}ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Connections</span>
                        <span className="text-slate-900 font-medium">
                          {health.database.connections} / {health.database.maxConnections}
                        </span>
                      </div>
                      <Progress
                        value={(health.database.connections / health.database.maxConnections) * 100}
                        className="h-2 bg-slate-200"
                      />
                    </CardContent>
                  </Card>

                  {/* Memory Usage Card */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-medium text-slate-900">
                        Memory Usage
                      </CardTitle>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          health.memory.percentage < 70
                            ? "bg-green-500"
                            : health.memory.percentage < 90
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Used</span>
                        <span className="text-slate-900 font-medium">
                          {formatBytes(health.memory.used)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Total</span>
                        <span className="text-slate-900 font-medium">
                          {formatBytes(health.memory.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Percentage</span>
                        <span className="text-slate-900 font-medium">
                          {health.memory.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={health.memory.percentage}
                        className={`h-2 bg-slate-200 ${
                          health.memory.percentage >= 90 ? "[&>div]:bg-red-500" : ""
                        }`}
                      />
                    </CardContent>
                  </Card>

                  {/* Uptime Card */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-medium text-slate-900">
                        System Uptime
                      </CardTitle>
                      <Activity className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 mb-2">
                        {formatUptime(health.uptime)}
                      </div>
                      <p className="text-sm text-slate-600">
                        Last checked:{" "}
                        {new Date(health.lastChecked).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>

                  {/* API Latency Card */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-medium text-slate-900">
                        API Latency
                      </CardTitle>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          health.apiLatency.p95 < 200
                            ? "bg-green-500"
                            : health.apiLatency.p95 < 500
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">P50 (Median)</span>
                        <span className="text-slate-900 font-medium">
                          {health.apiLatency.p50}ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">P95</span>
                        <span className="text-slate-900 font-medium">
                          {health.apiLatency.p95}ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">P99</span>
                        <span className="text-slate-900 font-medium">
                          {health.apiLatency.p99}ms
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="bg-white border-slate-200">
                  <CardContent className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      Health Data Unavailable
                    </h3>
                    <p className="text-slate-600">
                      Unable to fetch system health information
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Feature Flag Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Create Feature Flag</DialogTitle>
              <DialogDescription className="text-slate-600">
                Add a new feature flag to control feature rollouts
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name" className="text-slate-700">
                  Flag Name
                </Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      key: generateKey(e.target.value),
                    });
                  }}
                  placeholder="New Dashboard Feature"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-key" className="text-slate-700">
                  Flag Key
                </Label>
                <Input
                  id="create-key"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder="new_dashboard_feature"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description" className="text-slate-700">
                  Description
                </Label>
                <Input
                  id="create-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enable the new dashboard layout"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-rollout" className="text-slate-700">
                  Rollout Percentage
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="create-rollout"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.rolloutPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rolloutPercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-24 bg-white border-slate-200 text-slate-900"
                  />
                  <span className="text-slate-700">%</span>
                  <Progress
                    value={formData.rolloutPercentage}
                    className="flex-1 h-2 bg-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="create-enabled" className="text-slate-700">
                  Enable Flag
                </Label>
                <Switch
                  id="create-enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enabled: checked })
                  }
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createFlagMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {createFlagMutation.isPending ? "Creating..." : "Create Flag"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Feature Flag Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Edit Feature Flag</DialogTitle>
              <DialogDescription className="text-slate-600">
                Update feature flag configuration
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-slate-700">
                  Flag Name
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="New Dashboard Feature"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-key" className="text-slate-700">
                  Flag Key
                </Label>
                <Input
                  id="edit-key"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder="new_dashboard_feature"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-slate-700">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enable the new dashboard layout"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rollout" className="text-slate-700">
                  Rollout Percentage
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="edit-rollout"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.rolloutPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rolloutPercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-24 bg-white border-slate-200 text-slate-900"
                  />
                  <span className="text-slate-700">%</span>
                  <Progress
                    value={formData.rolloutPercentage}
                    className="flex-1 h-2 bg-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-enabled" className="text-slate-700">
                  Enable Flag
                </Label>
                <Switch
                  id="edit-enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enabled: checked })
                  }
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedFlag(null);
                    resetForm();
                  }}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateFlagMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {updateFlagMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Delete Feature Flag</DialogTitle>
              <DialogDescription className="text-slate-600">
                Are you sure you want to delete this feature flag? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            {selectedFlag && (
              <div className="py-4">
                <p className="text-slate-900">
                  <strong>Flag:</strong> {selectedFlag.name}
                </p>
                <p className="text-slate-600">
                  <strong>Key:</strong>{" "}
                  <code className="bg-slate-100 px-2 py-1 rounded text-slate-700">{selectedFlag.key}</code>
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedFlag(null);
                }}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteFlagMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteFlagMutation.isPending ? "Deleting..." : "Delete Flag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
