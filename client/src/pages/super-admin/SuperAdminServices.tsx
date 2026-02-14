/**
 * Super Admin Services Management
 *
 * Platform-wide service catalog management:
 * - View all services across all tenants
 * - Enable/disable services globally
 * - Configure service templates and SLAs
 * - View service usage analytics
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DashboardLayout,
  PageShell,
  MetricCard,
  DataTable,
  EmptyState,
} from "@/components/v3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  LayoutDashboard,
  Building2,
  Briefcase,
  DollarSign,
  Percent,
  Link as LinkIcon,
  ShieldCheck,
  Settings,
  BarChart3,
  FileText,
  Plus,
  Search,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
} from "lucide-react";

interface PlatformService {
  id: number;
  serviceKey: string;
  name: string;
  description: string;
  category: string;
  periodicity: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
  basePriceInr: number;
  slaHours: number;
  isActive: boolean;
  tenantsEnabled: number;
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceStats {
  totalServices: number;
  activeServices: number;
  totalRequests: number;
  avgCompletionRate: number;
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

const categories = [
  "Business Registration",
  "Taxation",
  "Compliance & Regulatory",
  "Intellectual Property",
  "Legal & Documentation",
  "Accounting & Bookkeeping",
  "HR & Payroll",
  "Advisory",
];

const periodicityOptions = [
  { value: "ONE_TIME", label: "One-Time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

// Mock data for initial display
const mockServices: PlatformService[] = [
  {
    id: 1,
    serviceKey: "gst_registration",
    name: "GST Registration",
    description: "Complete GST registration for new businesses",
    category: "Taxation",
    periodicity: "ONE_TIME",
    basePriceInr: 2999,
    slaHours: 72,
    isActive: true,
    tenantsEnabled: 45,
    totalRequests: 1250,
    activeRequests: 32,
    completedRequests: 1180,
    createdAt: "2024-01-15",
    updatedAt: "2024-12-01",
  },
  {
    id: 2,
    serviceKey: "gst_returns_monthly",
    name: "GST Returns Filing",
    description: "Monthly GST return filing (GSTR-1, GSTR-3B)",
    category: "Taxation",
    periodicity: "MONTHLY",
    basePriceInr: 999,
    slaHours: 48,
    isActive: true,
    tenantsEnabled: 52,
    totalRequests: 8500,
    activeRequests: 420,
    completedRequests: 7950,
    createdAt: "2024-01-15",
    updatedAt: "2024-12-01",
  },
  {
    id: 3,
    serviceKey: "pvt_ltd_incorporation",
    name: "Private Limited Incorporation",
    description: "End-to-end company incorporation with MCA",
    category: "Business Registration",
    periodicity: "ONE_TIME",
    basePriceInr: 14999,
    slaHours: 168,
    isActive: true,
    tenantsEnabled: 38,
    totalRequests: 450,
    activeRequests: 15,
    completedRequests: 420,
    createdAt: "2024-01-15",
    updatedAt: "2024-12-01",
  },
  {
    id: 4,
    serviceKey: "trademark_registration",
    name: "Trademark Registration",
    description: "Complete trademark filing and registration",
    category: "Intellectual Property",
    periodicity: "ONE_TIME",
    basePriceInr: 8999,
    slaHours: 120,
    isActive: true,
    tenantsEnabled: 25,
    totalRequests: 180,
    activeRequests: 8,
    completedRequests: 165,
    createdAt: "2024-02-01",
    updatedAt: "2024-11-15",
  },
  {
    id: 5,
    serviceKey: "annual_compliance",
    name: "Annual ROC Compliance",
    description: "Annual return filing and compliance for companies",
    category: "Compliance & Regulatory",
    periodicity: "ANNUAL",
    basePriceInr: 5999,
    slaHours: 240,
    isActive: false,
    tenantsEnabled: 0,
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    createdAt: "2024-06-01",
    updatedAt: "2024-06-01",
  },
];

const mockStats: ServiceStats = {
  totalServices: 96,
  activeServices: 78,
  totalRequests: 15420,
  avgCompletionRate: 94.5,
};

export default function SuperAdminServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PlatformService | null>(null);

  const [formData, setFormData] = useState({
    serviceKey: "",
    name: "",
    description: "",
    category: "",
    periodicity: "ONE_TIME" as const,
    basePriceInr: 0,
    slaHours: 24,
    isActive: true,
  });

  // Fetch services
  const { data: servicesData, isLoading } = useQuery<{ services: PlatformService[]; stats: ServiceStats }>({
    queryKey: ["/api/super-admin/services"],
    placeholderData: { services: mockServices, stats: mockStats },
  });

  const services = servicesData?.services || [];
  const stats = servicesData?.stats || mockStats;

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/super-admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/services"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Service Created", description: "New service has been added to the platform." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create service.", variant: "destructive" });
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/super-admin/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/services"] });
      setIsEditDialogOpen(false);
      setSelectedService(null);
      toast({ title: "Service Updated", description: "Service has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update service.", variant: "destructive" });
    },
  });

  // Toggle service status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/super-admin/services/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle service");
      return response.json();
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/services"] });
      toast({
        title: isActive ? "Service Enabled" : "Service Disabled",
        description: `Service has been ${isActive ? "enabled" : "disabled"} globally.`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update service status.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      serviceKey: "",
      name: "",
      description: "",
      category: "",
      periodicity: "ONE_TIME",
      basePriceInr: 0,
      slaHours: 24,
      isActive: true,
    });
  };

  const handleEdit = (service: PlatformService) => {
    setSelectedService(service);
    setFormData({
      serviceKey: service.serviceKey,
      name: service.name,
      description: service.description,
      category: service.category,
      periodicity: service.periodicity,
      basePriceInr: service.basePriceInr,
      slaHours: service.slaHours,
      isActive: service.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleStatus = (service: PlatformService) => {
    toggleStatusMutation.mutate({ id: service.id, isActive: !service.isActive });
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch = !searchQuery ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.serviceKey.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || service.category === categoryFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === "active" && service.isActive) ||
      (statusFilter === "inactive" && !service.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const user = { name: "Super Admin", email: "superadmin@digicomply.com" };

  const columns = [
    {
      key: "name",
      header: "Service",
      sortable: true,
      render: (item: PlatformService) => (
        <div>
          <p className="font-medium text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500 font-mono">{item.serviceKey}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item: PlatformService) => (
        <Badge variant="outline" className="text-xs">
          {item.category}
        </Badge>
      ),
    },
    {
      key: "periodicity",
      header: "Frequency",
      render: (item: PlatformService) => (
        <span className="text-sm text-slate-600">
          {periodicityOptions.find(p => p.value === item.periodicity)?.label}
        </span>
      ),
    },
    {
      key: "basePriceInr",
      header: "Base Price",
      render: (item: PlatformService) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(item.basePriceInr)}
        </span>
      ),
    },
    {
      key: "tenantsEnabled",
      header: "Tenants",
      render: (item: PlatformService) => (
        <span className="text-sm">{item.tenantsEnabled} enabled</span>
      ),
    },
    {
      key: "requests",
      header: "Requests",
      render: (item: PlatformService) => (
        <div className="text-sm">
          <span className="font-medium">{item.totalRequests.toLocaleString()}</span>
          <span className="text-slate-500"> total</span>
          {item.activeRequests > 0 && (
            <span className="text-blue-600 ml-1">({item.activeRequests} active)</span>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (item: PlatformService) => (
        <Badge className={item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
          {item.isActive ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
          )}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: PlatformService) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Switch
            checked={item.isActive}
            onCheckedChange={() => handleToggleStatus(item)}
          />
        </div>
      ),
    },
  ];

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
        title="Platform Services"
        subtitle="Manage services available across all tenants"
        breadcrumbs={[{ label: "Super Admin", href: "/super-admin/dashboard" }, { label: "Services" }]}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Services"
              value={stats.totalServices.toString()}
              trend={{ value: "Platform catalog", direction: "neutral" }}
              icon={Briefcase}
              accentColor="purple"
            />
            <MetricCard
              label="Active Services"
              value={stats.activeServices.toString()}
              trend={{ value: `${Math.round((stats.activeServices / stats.totalServices) * 100)}% enabled`, direction: "up" }}
              icon={CheckCircle}
              accentColor="green"
            />
            <MetricCard
              label="Total Requests"
              value={stats.totalRequests.toLocaleString()}
              trend={{ value: "All time", direction: "neutral" }}
              icon={FileText}
              accentColor="blue"
            />
            <MetricCard
              label="Completion Rate"
              value={`${stats.avgCompletionRate}%`}
              trend={{ value: "Platform average", direction: "up" }}
              icon={TrendingUp}
              accentColor="green"
            />
          </div>

          {/* Filters */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search services..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Services Table */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-200 rounded-lg" />
              ))}
            </div>
          ) : filteredServices.length > 0 ? (
            <DataTable
              data={filteredServices}
              columns={columns}
              keyField="id"
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No Services Found"
              description="No services match your search criteria."
              action={
                <Button variant="outline" onClick={() => { setSearchQuery(""); setCategoryFilter(""); setStatusFilter(""); }}>
                  Clear Filters
                </Button>
              }
            />
          )}
        </div>

        {/* Create Service Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Platform Service</DialogTitle>
              <DialogDescription>
                Create a new service that can be enabled by tenants.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Key</Label>
                  <Input
                    placeholder="e.g., gst_registration"
                    value={formData.serviceKey}
                    onChange={(e) => setFormData({ ...formData, serviceKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    placeholder="e.g., GST Registration"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Service description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formData.periodicity} onValueChange={(v: any) => setFormData({ ...formData, periodicity: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodicityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price (INR)</Label>
                  <Input
                    type="number"
                    value={formData.basePriceInr}
                    onChange={(e) => setFormData({ ...formData, basePriceInr: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SLA (Hours)</Label>
                  <Input
                    type="number"
                    value={formData.slaHours}
                    onChange={(e) => setFormData({ ...formData, slaHours: parseInt(e.target.value) || 24 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Immediately</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>
                Update service configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Key</Label>
                  <Input value={formData.serviceKey} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formData.periodicity} onValueChange={(v: any) => setFormData({ ...formData, periodicity: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodicityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price (INR)</Label>
                  <Input
                    type="number"
                    value={formData.basePriceInr}
                    onChange={(e) => setFormData({ ...formData, basePriceInr: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SLA (Hours)</Label>
                  <Input
                    type="number"
                    value={formData.slaHours}
                    onChange={(e) => setFormData({ ...formData, slaHours: parseInt(e.target.value) || 24 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedService(null); }}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedService && updateMutation.mutate({ id: selectedService.id, data: formData })}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
